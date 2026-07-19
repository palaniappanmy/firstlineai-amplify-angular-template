export type ReviewOptionKey =
  | 'includeDiagnosisSummary'
  | 'includeHistoricalPatients'
  | 'includeClinicalEvidence'
  | 'draftPreAuthorizationLetter';

export interface ReviewOptions {
  includeDiagnosisSummary: boolean;
  includeHistoricalPatients: boolean;
  includeClinicalEvidence: boolean;
  draftPreAuthorizationLetter: boolean;
}

export interface ReviewOptionCard {
  key: ReviewOptionKey;
  title: string;
  description: string;
  icon: string;
}

export interface PhysicianReviewGenerateRequest {
  patientId: string;
  doctorInstructions: string;
  options: ReviewOptions;
}

export interface TimelineItem {
  label: string;
  detail: string;
}

export interface EvidenceCard {
  title: string;
  source: string;
  summary: string;
  confidence: string;
  link?: string;
}

export interface HistoricalPatientRow {
  patient: string;
  similarity: string;
  outcome: string;
  age: string;
  treatment: string;
  response: string;
}

export type RecommendedDecision = 'Approve' | 'Pend' | 'Deny' | 'Unknown';

export interface PhysicianReviewViewModel {
  diagnosisSummary: string;
  treatmentTimelineItems: TimelineItem[];
  treatmentTimelineNarrative: string;
  clinicalEvidence: EvidenceCard[];
  historicalPatients: HistoricalPatientRow[];
  historicalPatientsNarrative: string;
  medicalNecessity: string;
  recommendedDecision: RecommendedDecision;
  decisionConfidence: string;
  preAuthorizationDraft: string;
  warnings: string[];
  reviewPackage: Record<string, unknown>;
}

export interface PhysicianApprovalRequest {
  patientId: string;
  approvalLetter: string;
  doctorInstructions: string;
  reviewPackage: Record<string, unknown>;
}

export interface PhysicianApprovalResponse {
  success: boolean;
  message: string;
  trackingId?: string;
}

