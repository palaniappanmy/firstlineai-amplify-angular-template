import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import {
  PayerDecisionPayload,
  PayerReviewViewModel,
  RiskItem
} from '../pages/payer-review/payer-review.models';

@Injectable({
  providedIn: 'root'
})
export class PayerReviewService {
  private readonly http = inject(HttpClient);

  private readonly preAuthUrl =
    'https://4hkd767sc5.execute-api.ap-southeast-2.amazonaws.com/mvp/analyze-patient';

  pullPreAuthRequest(patientId: string): Observable<PayerReviewViewModel> {
    const payload = { patientId };
    return this.http.post(this.preAuthUrl, payload, { responseType: 'text' }).pipe(
      map((rawText) => {
        let parsed: unknown = rawText;
        try {
          parsed = JSON.parse(rawText);
        } catch {
          // plain text — keep as-is
        }
        return this.mapResponse(parsed, patientId);
      }),
      catchError((error: unknown) => throwError(() => this.toError(error)))
    );
  }

  submitDecision(payload: PayerDecisionPayload): Observable<{ success: boolean; message: string; referenceId: string }> {
    // Placeholder — replace with real endpoint when available
    const referenceId = `PAR-${Date.now()}`;
    return of({
      success: true,
      message: `Decision "${payload.decision}" submitted for patient ${payload.patientId}.`,
      referenceId
    });
  }

  private mapResponse(response: unknown, patientId: string): PayerReviewViewModel {
    let root: Record<string, unknown> = {};

    if (typeof response === 'string') {
      try {
        root = JSON.parse(response) as Record<string, unknown>;
      } catch {
        root = { patientSummary: response };
      }
    } else if (this.isRecord(response)) {
      const body = response['body'];
      if (typeof body === 'string') {
        try {
          root = JSON.parse(body) as Record<string, unknown>;
        } catch {
          root = { patientSummary: body };
        }
      } else if (this.isRecord(body)) {
        root = body;
      } else {
        root = response;
      }
    }

    const str = (keys: string[]): string => {
      for (const k of keys) {
        const v = root[k];
        if (typeof v === 'string' && v.trim()) {
          return v.trim();
        }
      }
      return '';
    };

    const riskAssessment: RiskItem[] = [];
    const riskData = root['riskAssessment'];
    if (this.isRecord(riskData)) {
      for (const [k, v] of Object.entries(riskData)) {
        if (typeof v === 'string' && v.trim()) {
          riskAssessment.push({
            label: k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).trim(),
            value: v.trim()
          });
        }
      }
    }

    const previousTreatmentHistory: string[] = [];
    const ph = root['previousTreatmentHistory'];
    if (Array.isArray(ph)) {
      ph.filter((h): h is string => typeof h === 'string').forEach((h) => previousTreatmentHistory.push(h));
    }

    const recommendedSearchTerms: string[] = [];
    const st = root['recommendedEvidenceSearchTerms'];
    if (Array.isArray(st)) {
      st.filter((t): t is string => typeof t === 'string').forEach((t) => recommendedSearchTerms.push(t));
    }

    // Build generic raw sections from any extra fields
    const knownKeys = new Set([
      'patientSummary', 'clinicalSummary', 'clinicalHistory', 'requestedTherapy', 'therapy',
      'previousTreatmentHistory', 'medicalNecessity', 'necessityRationale', 'clinicalRationale',
      'rationale', 'riskAssessment', 'priorAuthorizationRecommendation', 'recommendation',
      'confidenceLevel', 'confidence', 'recommendedEvidenceSearchTerms',
      'statusCode', 'headers', 'body', 'patientId'
    ]);

    const rawSections: { heading: string; body: string }[] = [];
    for (const [k, v] of Object.entries(root)) {
      if (!knownKeys.has(k) && v !== null && v !== undefined) {
        const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).trim();
        const text = typeof v === 'string' ? v : Array.isArray(v)
          ? v.filter((i): i is string => typeof i === 'string').join(', ')
          : this.isRecord(v)
            ? Object.entries(v).filter(([, val]) => typeof val === 'string').map(([k2, val]) => `${k2}: ${val}`).join('\n')
            : String(v);
        if (text.trim()) {
          rawSections.push({ heading: label, body: text.trim() });
        }
      }
    }

    return {
      patientId: patientId || str(['patientId', 'patient_id']),
      patientSummary: str(['patientSummary']),
      clinicalSummary: str(['clinicalSummary', 'clinicalHistory']),
      requestedTherapy: str(['requestedTherapy', 'therapy']),
      previousTreatmentHistory,
      medicalNecessity: str(['medicalNecessity', 'necessityRationale']),
      clinicalRationale: str(['clinicalRationale', 'rationale']),
      riskAssessment,
      priorAuthRecommendation: str(['priorAuthorizationRecommendation', 'recommendation']),
      confidenceLevel: str(['confidenceLevel', 'confidence']),
      recommendedSearchTerms,
      rawSections
    };
  }

  private toError(error: unknown): Error {
    if (error instanceof HttpErrorResponse) {
      const body = error.error;
      if (this.isRecord(body)) {
        const msg = this.readString(body, ['message', 'error']);
        if (msg) {
          return new Error(msg);
        }
      }
      if (typeof body === 'string' && body.trim()) {
        return new Error(body.trim());
      }
      return new Error('Request failed. Please try again.');
    }
    if (error instanceof Error) {
      return error;
    }
    return new Error('Unexpected error occurred.');
  }

  private readString(source: Record<string, unknown>, keys: string[]): string | undefined {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
    return undefined;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}

