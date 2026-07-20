import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { HistoryInsights } from '../pages/history-insights/history-insights.models';

@Injectable({
  providedIn: 'root'
})
export class HistoryInsightsService {
  private readonly http = inject(HttpClient);

  getInsights(patientId?: string): Observable<HistoryInsights> {
    // MVP: load curated demo data. Later replace with `/api/history-insights/{patientId}`.
    void patientId;
    return this.http.get<HistoryInsights>('assets/mock/history-insights.json');
  }
}

