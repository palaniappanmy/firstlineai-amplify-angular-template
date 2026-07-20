export interface HistoryInsightCase {
  patientId: string;
  decision: 'Approved' | 'Denied' | string;
}

export interface HistoryInsightCluster {
  id: string;
  name: string;
  patientCount: number;
  similarity: number;
  approvalRate: number;
  averageAge: number;
  averageLos: number;
  topDiagnosis: string;
  recommendation: string;
  cases: HistoryInsightCase[];
}

export interface HistoryInsights {
  summary: {
    historicalCases: number;
    averageSimilarity: number;
    approvalRate: number;
    averageReviewDays: number;
  };
  approvalSummary: {
    approved: number;
    denied: number;
  };
  clusters: HistoryInsightCluster[];
}

