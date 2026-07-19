export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Unknown';

export interface AIInsights {
  patientSummary: string;
  clinicalTrajectory: string;
  therapyStage: string;
  clinicalComplexity: RiskLevel | string;
  priorAuthorizationLikelihood: RiskLevel | string;
  careGapSummary: string;
  recommendedSearchKeywords: string[];
}

export interface PatientSummary {
  patientId: string;
  storageStatus: 'Successfully Stored' | 'Not Stored';
  analysisStatus: 'Completed' | 'Failed';
  timestamp: string;
}

export interface Assessment {
  title: string;
  value: string;
  level: RiskLevel;
}

export interface Keyword {
  value: string;
}

export interface PatientAnalysisResponse {
  success: boolean;
  patientId?: string;
  message?: string;
  error?: string;
  stored?: boolean;
  timestamp?: string;
  aiInsights?: {
    aiInsights?: AIInsights;
  };
}

