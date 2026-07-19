import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

import { EvidenceCard } from '../models';

@Component({
  selector: 'app-clinical-evidence',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="section-card">
      <h3>Clinical Evidence</h3>

      @if (evidence.length === 0) {
      <p>No clinical evidence available.</p>
      } @else {
      <div class="evidence-grid">
        @for (card of evidence; track card.title + card.summary) {
        <article class="evidence-card">
          <div class="card-header">
            <h4>{{ card.title }}</h4>
            <span class="confidence">{{ card.confidence }}</span>
          </div>
          <p class="source"><strong>Source:</strong> {{ card.source }}</p>
          <p>{{ card.summary }}</p>
          @if (card.link) {
          <a [href]="card.link" target="_blank" rel="noopener noreferrer">Reference Link</a>
          }
        </article>
        }
      </div>
      }
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
        margin: 0 0 0.6rem;
      }

      .evidence-grid {
        display: grid;
        gap: 0.9rem;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .evidence-card {
        border: 1px solid #d8e2ef;
        border-radius: 12px;
        padding: 0.9rem;
        background: #fcfdff;
      }

      .card-header {
        display: flex;
        align-items: start;
        justify-content: space-between;
        gap: 0.5rem;
      }

      h4 {
        margin: 0 0 0.35rem;
      }

      .confidence {
        white-space: nowrap;
        font-size: 0.73rem;
        color: #1952b0;
        background: #e8f0ff;
        border-radius: 999px;
        padding: 0.18rem 0.5rem;
        font-weight: 700;
      }

      .source {
        color: #2f4965;
      }

      p {
        margin: 0.2rem 0;
        white-space: pre-wrap;
      }

      a {
        display: inline-block;
        margin-top: 0.3rem;
      }

      @media (max-width: 900px) {
        .evidence-grid {
          grid-template-columns: 1fr;
        }
      }
    `
  ]
})
export class ClinicalEvidenceComponent {
  @Input({ required: true }) evidence: EvidenceCard[] = [];
}


