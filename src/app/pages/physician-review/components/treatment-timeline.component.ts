import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

import { TimelineItem } from '../models';

@Component({
  selector: 'app-treatment-timeline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="section-card">
      <h3>Treatment Timeline</h3>

      <ul class="timeline-list">
        @for (item of displayItems(); track item.label + item.detail; let isLast = $last) {
        <li class="timeline-item">
          <div class="dot" aria-hidden="true"></div>
          <div class="content">
            <strong>{{ item.label }}</strong>
            <p>{{ item.detail }}</p>
          </div>
          @if (!isLast) {
          <div class="arrow" aria-hidden="true">↓</div>
          }
        </li>
        }
      </ul>
    </section>
  `,
  styles: [
    `
      .section-card {
        background: #fff;
        border: 1px solid #d8e2ef;
        border-radius: 16px;
        padding: 1.25rem;
      }

      h3 {
        margin: 0 0 0.9rem;
      }

      .timeline-list {
        list-style: none;
        margin: 0;
        padding: 0;
      }

      .timeline-item {
        display: grid;
        grid-template-columns: 12px 1fr;
        gap: 0.75rem;
        position: relative;
        padding-bottom: 1rem;
      }

      .dot {
        width: 10px;
        height: 10px;
        background: #1e61d6;
        border-radius: 50%;
        margin-top: 0.35rem;
      }

      .content {
        background: #f7faff;
        border: 1px solid #dce7fa;
        border-radius: 10px;
        padding: 0.6rem 0.75rem;
      }

      .content strong {
        display: block;
      }

      p {
        margin: 0.25rem 0 0;
        white-space: pre-wrap;
      }

      .arrow {
        position: absolute;
        left: 0;
        bottom: 0.05rem;
        color: #4f79be;
        font-size: 0.9rem;
      }
    `
  ]
})
export class TreatmentTimelineComponent {
  @Input({ required: true }) items: TimelineItem[] = [];
  @Input({ required: true }) narrative = '';

  displayItems(): TimelineItem[] {
    if (this.items.length > 0) {
      return this.items;
    }

    return [
      {
        label: 'Timeline',
        detail: this.narrative || 'Unable to interpret this section. Please regenerate the review package.'
      }
    ];
  }
}


