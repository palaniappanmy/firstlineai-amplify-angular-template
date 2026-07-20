export interface RiskItem {
  label: string;
  value: string;
}

export interface PayerReviewViewModel {
  patientId: string;
  patientSummary: string;
  clinicalSummary: string;
  requestedTherapy: string;
  previousTreatmentHistory: string[];
  medicalNecessity: string;
  clinicalRationale: string;
  riskAssessment: RiskItem[];
  priorAuthRecommendation: string;
  confidenceLevel: string;
  recommendedSearchTerms: string[];
  rawSections: { heading: string; body: string }[];
}

export type PayerDecision = 'Approve' | 'Review' | 'OfflineDiscuss';

export interface PayerDecisionPayload {
  patientId: string;
  decision: PayerDecision;
  recommendedDrugs: string;
  notes: string;
}

