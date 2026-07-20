import { Injectable } from '@angular/core';

import {
  EvidenceCard,
  HistoricalPatientRow,
  PhysicianReviewViewModel,
  RecommendedDecision,
  TimelineItem
} from '../pages/physician-review/models';

@Injectable({
  providedIn: 'root'
})
export class ReviewResponseMapperService {
  mapGenerateResponse(response: unknown): PhysicianReviewViewModel {
    // Case 1: plain string
    if (typeof response === 'string') {
      return this.isErrorText(response)
        ? this.buildFallbackViewModel(response)
        : this.mapNarrativeText(response);
    }

    if (!this.isRecord(response)) {
      return this.buildFallbackViewModel('Unable to interpret response.');
    }

    // Case 2: Lambda proxy wrapper { statusCode, headers, body: string }
    const bodyField = response['body'];
    if (typeof bodyField === 'string') {
      if (this.isErrorText(bodyField)) {
        return this.buildFallbackViewModel(bodyField);
      }

      // Try to parse body as JSON first (pre-auth structured response)
      try {
        const parsedBody = JSON.parse(bodyField);
        if (this.isRecord(parsedBody)) {
          return this.mapJsonPayload(parsedBody);
        }
      } catch {
        // not JSON — fall through to narrative text parsing
      }

      return this.mapNarrativeText(bodyField);
    }

    // Case 3: Lambda proxy with body as JSON object
    if (this.isRecord(bodyField)) {
      return this.mapJsonPayload(this.mergeWrappers(bodyField, response));
    }

    // Case 4: Pure JSON object (no Lambda proxy wrapper)
    return this.mapJsonPayload(this.extractPrimaryPayload(response));
  }

  // ─── Narrative text path ──────────────────────────────────────────────────

  private mapNarrativeText(text: string): PhysicianReviewViewModel {
    const sections = this.parseNumberedSections(text);

    const similarSection =
      sections['similar patients'] ?? sections['similar patients:'] ?? '';
    const charSection =
      sections['shared clinical characteristics'] ??
      sections['shared clinical characteristics:'] ?? '';
    const summarySection =
      sections['clinical similarity summary'] ??
      sections['clinical summary'] ??
      sections['summary'] ?? '';
    const confidenceSection =
      sections['confidence level'] ?? sections['confidence level:'] ?? '';

    const diagnosisSummary = this.buildDiagnosisSummary(charSection) || text;

    const timelineItems = this.buildTimelineFromCharSection(charSection);

    const historicalPatients = this.parsePatientRows(similarSection);

    const medicalNecessity = summarySection.trim() || charSection.trim() || text;

    const confidence = confidenceSection.trim() || 'Medium';
    const decision = this.inferDecisionFromConfidence(confidence);

    const warnings: string[] = [];
    if (!historicalPatients.length && !similarSection) {
      warnings.push('Similar patients data was not available in this response.');
    }

    return {
      diagnosisSummary: diagnosisSummary.trim() || 'Not Available',
      treatmentTimelineItems: timelineItems,
      treatmentTimelineNarrative: timelineItems.length
        ? 'Timeline extracted from response.'
        : medicalNecessity,
      clinicalEvidence: this.buildEvidenceFromSections(sections),
      historicalPatients,
      historicalPatientsNarrative: summarySection.trim() || '',
      medicalNecessity: medicalNecessity.trim() || 'Not Available',
      recommendedDecision: decision,
      decisionConfidence: confidence,
      preAuthorizationDraft: this.buildPreAuthLetterFromNarrative(text, sections),
      warnings,
      reviewPackage: { rawText: text, sections }
    };
  }

  private buildPreAuthLetterFromNarrative(rawText: string, sections: Record<string, string>): string {
    const lines: string[] = ['PRE-AUTHORIZATION CLINICAL SUMMARY', '━'.repeat(52), ''];

    const sectionEntries = Object.entries(sections);
    if (sectionEntries.length > 0) {
      for (const [key, value] of sectionEntries) {
        if (value.trim()) {
          lines.push(key.toUpperCase());
          lines.push(value.trim());
          lines.push('');
        }
      }
    } else {
      lines.push(rawText.trim());
    }

    return lines.join('\n').trim();
  }

  private parseNumberedSections(text: string): Record<string, string> {
    const sections: Record<string, string> = {};
    const lines = text.split('\n');

    let currentKey = '';
    const buffer: string[] = [];

    for (const line of lines) {
      // Match "1. Section Title:" or "1. Section Title"
      const headerMatch = line.match(/^\s*\d+\.\s+([\w\s]+?)(?:\s*:\s*(.*))?\s*$/);
      if (headerMatch) {
        if (currentKey) {
          sections[currentKey] = buffer.join('\n').trim();
        }

        currentKey = headerMatch[1].trim().toLowerCase();
        buffer.length = 0;

        if (headerMatch[2] && headerMatch[2].trim()) {
          buffer.push(headerMatch[2].trim());
        }
      } else if (currentKey) {
        buffer.push(line);
      }
    }

    if (currentKey) {
      sections[currentKey] = buffer.join('\n').trim();
    }

    return sections;
  }

  private buildDiagnosisSummary(charSectionText: string): string {
    if (!charSectionText) {
      return '';
    }

    const diagnoses = this.extractBulletValue(charSectionText, 'diagnoses');
    const outcomes = this.extractBulletValue(charSectionText, 'clinical outcomes');

    const parts = [
      diagnoses ? `Diagnosis: ${diagnoses}` : null,
      outcomes ? `Clinical Outcomes: ${outcomes}` : null,
      !diagnoses && !outcomes ? charSectionText : null
    ].filter((p): p is string => p !== null);

    return parts.join('\n');
  }

  private buildTimelineFromCharSection(charSectionText: string): TimelineItem[] {
    const progression =
      this.extractBulletValue(charSectionText, 'treatment progression') ?? '';
    const failures =
      this.extractBulletValue(charSectionText, 'therapy failures') ?? '';
    const escalations =
      this.extractBulletValue(charSectionText, 'therapy escalations') ?? '';

    if (!progression && !failures && !escalations) {
      return [];
    }

    const items: TimelineItem[] = [];

    if (progression) {
      progression
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .forEach((step, i) => items.push({ label: `Step ${i + 1}`, detail: step }));
    }

    if (failures) {
      items.push({ label: 'Treatment Failure', detail: failures });
    }

    if (escalations) {
      items.push({ label: 'Therapy Escalation', detail: escalations });
    }

    return items;
  }

  private parsePatientRows(similarSectionText: string): HistoricalPatientRow[] {
    if (!similarSectionText) {
      return [];
    }

    // Extract all patient IDs matching P followed by digits
    const patientIdMatches = similarSectionText.match(/P\d{3,}/g) ?? [];
    const uniqueIds = [...new Set(patientIdMatches)];

    if (uniqueIds.length === 0) {
      return [];
    }

    // Try to get a common rationale line
    const rationaleMatch = similarSectionText.match(/similarity rationale\s*:\s*(.+)/i);
    const outcome = rationaleMatch ? rationaleMatch[1].trim() : 'Similar treatment journey and clinical outcome.';

    return uniqueIds.map((id) => ({
      patient: id,
      similarity: 'High',
      outcome,
      age: 'Not Available',
      treatment: 'Not Available',
      response: 'Improved'
    }));
  }

  private buildEvidenceFromSections(sections: Record<string, string>): EvidenceCard[] {
    const outcomeSection =
      sections['clinical outcomes'] ??
      sections['outcomes'] ??
      sections['clinical evidence'] ?? '';

    if (!outcomeSection) {
      return [];
    }

    return [
      {
        title: 'Clinical Evidence',
        source: 'AI Analysis',
        summary: outcomeSection.trim(),
        confidence: 'High'
      }
    ];
  }

  private extractBulletValue(text: string, field: string): string | undefined {
    const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`[-\\s]*${escaped}\\s*:?\\s*(.+)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : undefined;
  }

  private inferDecisionFromConfidence(confidence: string): RecommendedDecision {
    const lower = confidence.toLowerCase();
    if (lower.includes('high')) {
      return 'Approve';
    }

    if (lower.includes('medium') || lower.includes('moderate')) {
      return 'Pend';
    }

    if (lower.includes('low')) {
      return 'Deny';
    }

    return 'Unknown';
  }

  private isErrorText(text: string): boolean {
    const lower = text.toLowerCase().trim();
    return (
      lower.startsWith('error') ||
      lower.includes('error processing') ||
      (lower.length < 80 && !lower.includes('\n') && lower.includes('error'))
    );
  }

  private buildFallbackViewModel(rawMessage: string): PhysicianReviewViewModel {
    return {
      diagnosisSummary: 'Unable to interpret this section. Please regenerate the review package.',
      treatmentTimelineItems: [],
      treatmentTimelineNarrative: 'Unable to interpret this section. Please regenerate the review package.',
      clinicalEvidence: [],
      historicalPatients: [],
      historicalPatientsNarrative: 'Unable to interpret this section.',
      medicalNecessity: 'Unable to interpret this section. Please regenerate the review package.',
      recommendedDecision: 'Unknown',
      decisionConfidence: 'Unknown',
      preAuthorizationDraft: '',
      warnings: [
        rawMessage.trim() ||
          'Unable to interpret the AI response. Please regenerate the review package.'
      ],
      reviewPackage: {}
    };
  }

  // ─── JSON payload path ────────────────────────────────────────────────────

  private mapJsonPayload(root: Record<string, unknown>): PhysicianReviewViewModel {
    // ── Diagnosis summary (try pre-auth fields first) ─────────────────────
    const diagnosisSummary =
      this.pickString(root, [
        'diagnosisSummary',
        'patientSummary',
        'clinicalSummary'
      ]) ?? 'Not Available';

    // ── Treatment timeline (previousTreatmentHistory takes precedence) ────
    const prevHistory = root['previousTreatmentHistory'];
    let timeline = this.normalizeTimeline(root);
    if (timeline.items.length === 0 && Array.isArray(prevHistory) && prevHistory.length > 0) {
      timeline = {
        items: prevHistory.map((h, i) => ({
          label: typeof h === 'string' ? h : `Treatment ${i + 1}`,
          detail: typeof h === 'string' ? `Prior treatment: ${h}` : JSON.stringify(h)
        })),
        narrative: 'Treatment history extracted from pre-authorization data.'
      };
    }

    // ── Clinical evidence (recommendedEvidenceSearchTerms → cards) ────────
    let evidence = this.normalizeEvidence(root);
    if (evidence.length === 0) {
      const searchTerms = root['recommendedEvidenceSearchTerms'];
      if (Array.isArray(searchTerms) && searchTerms.length > 0) {
        evidence = searchTerms
          .filter((t): t is string => typeof t === 'string')
          .map((term) => ({
            title: term,
            source: 'AI Recommended',
            summary: 'AI-recommended search term for supporting clinical evidence.',
            confidence: 'High'
          }));
      }
    }

    // ── Historical patients ───────────────────────────────────────────────
    const historicalPatients = this.normalizeHistoricalPatients(root);

    // ── Medical necessity (include riskAssessment) ─────────────────────────
    let medicalNecessity =
      this.pickString(root, [
        'medicalNecessity',
        'medicalNecessitySummary',
        'necessityRationale',
        'clinicalRationale'
      ]) ?? 'Not Available';

    const riskAssessment = root['riskAssessment'];
    if (this.isRecord(riskAssessment)) {
      const riskLines = Object.entries(riskAssessment)
        .filter(([, v]) => typeof v === 'string')
        .map(([k, v]) => `  • ${this.camelToLabel(k)}: ${v}`)
        .join('\n');
      if (riskLines) {
        medicalNecessity =
          medicalNecessity !== 'Not Available'
            ? `${medicalNecessity}\n\nRisk Assessment:\n${riskLines}`
            : `Risk Assessment:\n${riskLines}`;
      }
    }

    // ── Decision (priorAuthorizationRecommendation takes precedence) ──────
    const recommendedDecision = this.normalizeDecision(
      this.pickString(root, [
        'priorAuthorizationRecommendation',
        'recommendedDecision',
        'decision',
        'recommendation'
      ])
    );

    const decisionConfidence =
      this.pickString(root, ['confidenceLevel', 'decisionConfidence', 'confidence']) ?? 'Medium';

    // ── Build pre-auth letter from all available fields ───────────────────
    const existingDraft = this.pickString(root, [
      'preAuthorizationDraft',
      'preAuthorizationLetter',
      'draftPreAuthorizationLetter',
      'authorizationDraft'
    ]);
    const preAuthorizationDraft = existingDraft ?? this.buildPreAuthLetter(root);

    const warnings: string[] = [];
    if (!timeline.items.length && timeline.narrative === 'No information available.') {
      warnings.push('Treatment timeline data was not available in this response.');
    }

    return {
      diagnosisSummary,
      treatmentTimelineItems: timeline.items,
      treatmentTimelineNarrative: timeline.narrative,
      clinicalEvidence: evidence,
      historicalPatients: historicalPatients.rows,
      historicalPatientsNarrative: historicalPatients.narrative,
      medicalNecessity,
      recommendedDecision,
      decisionConfidence,
      preAuthorizationDraft,
      warnings,
      reviewPackage: {
        diagnosisSummary,
        treatmentTimelineItems: timeline.items,
        medicalNecessity,
        recommendedDecision,
        preAuthorizationDraft
      }
    };
  }

  // ── Pre-authorization letter builder ─────────────────────────────────────

  private buildPreAuthLetter(source: Record<string, unknown>): string {
    const lines: string[] = [];
    const handled = new Set<string>();

    const addSection = (heading: string, value: string | undefined, keys: string[]): void => {
      keys.forEach((k) => handled.add(k));
      if (!value) {
        return;
      }

      lines.push(heading.toUpperCase());
      lines.push(value);
      lines.push('');
    };

    lines.push('PRE-AUTHORIZATION REQUEST');
    lines.push('━'.repeat(52));
    lines.push('');

    addSection('Patient Summary', this.pickString(source, ['patientSummary']), ['patientSummary']);
    addSection('Clinical Summary', this.pickString(source, ['clinicalSummary', 'clinicalHistory']), ['clinicalSummary', 'clinicalHistory']);

    const requestedTherapy = this.pickString(source, ['requestedTherapy', 'therapy']);
    handled.add('requestedTherapy');
    handled.add('therapy');
    if (requestedTherapy) {
      lines.push('REQUESTED THERAPY');
      lines.push(requestedTherapy);
      lines.push('');
    }

    const prevHistory = source['previousTreatmentHistory'];
    handled.add('previousTreatmentHistory');
    if (Array.isArray(prevHistory) && prevHistory.length > 0) {
      lines.push('PREVIOUS TREATMENT HISTORY');
      prevHistory.forEach((h) => {
        lines.push(`  • ${typeof h === 'string' ? h : JSON.stringify(h)}`);
      });
      lines.push('');
    }

    addSection('Medical Necessity', this.pickString(source, ['medicalNecessity', 'medicalNecessitySummary']), ['medicalNecessity', 'medicalNecessitySummary']);
    addSection('Clinical Rationale', this.pickString(source, ['clinicalRationale', 'rationale']), ['clinicalRationale', 'rationale']);

    const riskAssessment = source['riskAssessment'];
    handled.add('riskAssessment');
    if (this.isRecord(riskAssessment)) {
      lines.push('RISK ASSESSMENT');
      for (const [k, v] of Object.entries(riskAssessment)) {
        if (typeof v === 'string') {
          lines.push(`  • ${this.camelToLabel(k)}: ${v}`);
        }
      }
      lines.push('');
    }

    const recommendation = this.pickString(source, ['priorAuthorizationRecommendation', 'recommendedDecision', 'recommendation']);
    ['priorAuthorizationRecommendation', 'recommendedDecision', 'recommendation'].forEach((k) => handled.add(k));
    if (recommendation) {
      lines.push('RECOMMENDATION');
      lines.push(recommendation);
      lines.push('');
    }

    const confidence = this.pickString(source, ['confidenceLevel', 'confidence', 'decisionConfidence']);
    ['confidenceLevel', 'confidence', 'decisionConfidence'].forEach((k) => handled.add(k));
    if (confidence) {
      lines.push('CONFIDENCE LEVEL');
      lines.push(confidence);
      lines.push('');
    }

    const searchTerms = source['recommendedEvidenceSearchTerms'];
    handled.add('recommendedEvidenceSearchTerms');
    if (Array.isArray(searchTerms) && searchTerms.length > 0) {
      lines.push('RECOMMENDED EVIDENCE SEARCH TERMS');
      searchTerms
        .filter((t): t is string => typeof t === 'string')
        .forEach((t) => lines.push(`  • ${t}`));
      lines.push('');
    }

    // Render any extra unknown fields generically
    const skipAlways = new Set(['statusCode', 'headers', 'body', 'diagnosisSummary',
      'treatmentTimeline', 'timeline', 'clinicalTrajectory', 'clinicalEvidence',
      'evidence', 'supportingEvidence', 'similarHistoricalPatients', 'historicalPatients',
      'comparablePatients', 'preAuthorizationDraft', 'preAuthorizationLetter',
      'draftPreAuthorizationLetter', 'authorizationDraft', 'timestamp', 'success',
      'message', 'error', 'stored', 'patientId']);

    const extraKeys = Object.keys(source).filter(
      (k) => !handled.has(k) && !skipAlways.has(k) && source[k] !== null && source[k] !== undefined
    );

    if (extraKeys.length > 0) {
      lines.push('━'.repeat(52));
      lines.push('ADDITIONAL INFORMATION');
      for (const key of extraKeys) {
        const val = source[key];
        lines.push('');
        lines.push(this.camelToLabel(key).toUpperCase());
        if (typeof val === 'string') {
          lines.push(val);
        } else if (Array.isArray(val)) {
          val.forEach((item) => lines.push(`  • ${typeof item === 'string' ? item : JSON.stringify(item)}`));
        } else if (this.isRecord(val)) {
          for (const [k2, v2] of Object.entries(val)) {
            if (typeof v2 === 'string') {
              lines.push(`  • ${this.camelToLabel(k2)}: ${v2}`);
            }
          }
        }
      }
      lines.push('');
    }

    return lines.join('\n').trim();
  }

  private camelToLabel(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (c) => c.toUpperCase())
      .trim();
  }

  private mergeWrappers(
    nested: Record<string, unknown>,
    outer: Record<string, unknown>
  ): Record<string, unknown> {
    return { ...nested, ...outer };
  }

  private extractPrimaryPayload(response: Record<string, unknown>): Record<string, unknown> {
    const wrappers = ['data', 'result', 'payload'];
    for (const wrapper of wrappers) {
      const nested = response[wrapper];
      if (this.isRecord(nested)) {
        return { ...nested, ...response };
      }
    }

    return response;
  }

  private normalizeTimeline(
    source: Record<string, unknown>
  ): { items: TimelineItem[]; narrative: string } {
    const candidate =
      source['treatmentTimeline'] ?? source['timeline'] ?? source['clinicalTrajectory'];

    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return {
        items: this.splitNarrativeTimeline(candidate),
        narrative: candidate
      };
    }

    if (Array.isArray(candidate)) {
      const items = candidate
        .map((entry, i) => this.mapTimelineEntry(entry, i))
        .filter((e): e is TimelineItem => e !== null);

      return {
        items,
        narrative: items.length ? 'Timeline extracted from structured response.' : 'No information available.'
      };
    }

    if (this.isRecord(candidate) && Array.isArray(candidate['steps'])) {
      const items = candidate['steps']
        .map((entry, i) => this.mapTimelineEntry(entry, i))
        .filter((e): e is TimelineItem => e !== null);

      return {
        items,
        narrative: items.length ? 'Timeline extracted from structured response.' : 'No information available.'
      };
    }

    return { items: [], narrative: 'No information available.' };
  }

  private splitNarrativeTimeline(narrative: string): TimelineItem[] {
    return narrative
      .split(/\s*(?:->|→|\n|\|)\s*/g)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .map((entry, index) => ({ label: `Step ${index + 1}`, detail: entry }));
  }

  private mapTimelineEntry(entry: unknown, index: number): TimelineItem | null {
    if (typeof entry === 'string' && entry.trim().length > 0) {
      return { label: `Step ${index + 1}`, detail: entry.trim() };
    }

    if (!this.isRecord(entry)) {
      return null;
    }

    const label =
      this.pickString(entry, ['label', 'phase', 'stage', 'date']) ?? `Step ${index + 1}`;
    const detail =
      this.pickString(entry, ['detail', 'description', 'event', 'summary']) ?? 'Not Available';

    return { label, detail };
  }

  private normalizeEvidence(source: Record<string, unknown>): EvidenceCard[] {
    const candidate =
      source['clinicalEvidence'] ?? source['evidence'] ?? source['supportingEvidence'];

    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return [
        { title: 'Clinical Evidence', source: 'Not Available', summary: candidate.trim(), confidence: 'Medium' }
      ];
    }

    if (Array.isArray(candidate)) {
      return candidate
        .map((entry, i) => this.mapEvidenceEntry(entry, i))
        .filter((e): e is EvidenceCard => e !== null);
    }

    if (this.isRecord(candidate)) {
      const single = this.mapEvidenceEntry(candidate, 0);
      return single ? [single] : [];
    }

    return [];
  }

  private mapEvidenceEntry(entry: unknown, index: number): EvidenceCard | null {
    if (typeof entry === 'string' && entry.trim().length > 0) {
      return {
        title: `Evidence ${index + 1}`,
        source: 'Not Available',
        summary: entry.trim(),
        confidence: 'Medium'
      };
    }

    if (!this.isRecord(entry)) {
      return null;
    }

    return {
      title: this.pickString(entry, ['title', 'name']) ?? `Evidence ${index + 1}`,
      source: this.pickString(entry, ['source', 'journal', 'publisher']) ?? 'Not Available',
      summary: this.pickString(entry, ['summary', 'detail', 'description']) ?? 'Not Available',
      confidence: this.pickString(entry, ['confidence', 'evidenceStrength']) ?? 'Medium',
      link: this.pickString(entry, ['link', 'url'])
    };
  }

  private normalizeHistoricalPatients(
    source: Record<string, unknown>
  ): { rows: HistoricalPatientRow[]; narrative: string } {
    const candidate =
      source['similarHistoricalPatients'] ??
      source['historicalPatients'] ??
      source['comparablePatients'];

    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return { rows: [], narrative: candidate.trim() };
    }

    if (Array.isArray(candidate)) {
      const rows = candidate
        .map((entry, i) => this.mapHistoricalPatient(entry, i))
        .filter((e): e is HistoricalPatientRow => e !== null);

      return { rows, narrative: rows.length ? '' : 'No information available.' };
    }

    if (this.isRecord(candidate) && Array.isArray(candidate['rows'])) {
      const rows = candidate['rows']
        .map((entry, i) => this.mapHistoricalPatient(entry, i))
        .filter((e): e is HistoricalPatientRow => e !== null);

      return { rows, narrative: rows.length ? '' : 'No information available.' };
    }

    return { rows: [], narrative: 'No information available.' };
  }

  private mapHistoricalPatient(entry: unknown, index: number): HistoricalPatientRow | null {
    if (typeof entry === 'string' && entry.trim().length > 0) {
      return {
        patient: `Patient ${index + 1}`,
        similarity: 'Not Available',
        outcome: entry.trim(),
        age: 'Not Available',
        treatment: 'Not Available',
        response: 'Not Available'
      };
    }

    if (!this.isRecord(entry)) {
      return null;
    }

    return {
      patient: this.pickString(entry, ['patient', 'patientId', 'id', 'name']) ?? `Patient ${index + 1}`,
      similarity: this.pickString(entry, ['similarity', 'match', 'score']) ?? 'Not Available',
      outcome: this.pickString(entry, ['outcome', 'result', 'summary']) ?? 'Not Available',
      age: this.pickString(entry, ['age', 'patientAge']) ?? 'Not Available',
      treatment: this.pickString(entry, ['treatment', 'therapy']) ?? 'Not Available',
      response: this.pickString(entry, ['response', 'status']) ?? 'Not Available'
    };
  }

  private normalizeDecision(value: string | undefined): RecommendedDecision {
    if (!value) {
      return 'Unknown';
    }

    const lower = value.trim().toLowerCase();
    if (lower.includes('approve')) {
      return 'Approve';
    }

    if (lower.includes('pend')) {
      return 'Pend';
    }

    if (lower.includes('deny')) {
      return 'Deny';
    }

    return 'Unknown';
  }

  private pickString(source: Record<string, unknown>, keys: string[]): string | undefined {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }

    return undefined;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}

