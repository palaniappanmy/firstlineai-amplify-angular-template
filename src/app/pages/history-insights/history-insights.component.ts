import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';

import { HistoryInsightsService } from '../../services/history-insights.service';
import { HistoryInsightCluster, HistoryInsights } from './history-insights.models';
import { JourneyHeaderComponent } from '../../components/journey-header.component';

@Component({
  selector: 'app-history-insights',
  standalone: true,
  imports: [CommonModule, JourneyHeaderComponent],
  templateUrl: './history-insights.component.html',
  styleUrl: './history-insights.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HistoryInsightsComponent implements OnInit {
  private readonly historyInsightsService = inject(HistoryInsightsService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly insights = signal<HistoryInsights | null>(null);

  readonly approvedPercent = computed(() => {
    const data = this.insights();
    if (!data) {
      return 0;
    }

    const total = data.approvalSummary.approved + data.approvalSummary.denied;
    return total === 0 ? 0 : Math.round((data.approvalSummary.approved / total) * 100);
  });

  readonly deniedPercent = computed(() => {
    const data = this.insights();
    if (!data) {
      return 0;
    }

    const total = data.approvalSummary.approved + data.approvalSummary.denied;
    return total === 0 ? 0 : Math.round((data.approvalSummary.denied / total) * 100);
  });

  ngOnInit(): void {
    this.historyInsightsService.getInsights().subscribe({
      next: (data) => {
        this.insights.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to load demo historical insights data. Please try again later.');
        this.loading.set(false);
      }
    });
  }

  clusterPercentage(cluster: HistoryInsightCluster, totalCases: number): number {
    if (!totalCases) {
      return 0;
    }

    return Math.round((cluster.patientCount / totalCases) * 100);
  }
}
