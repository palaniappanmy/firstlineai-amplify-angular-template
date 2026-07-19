import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-diagnosis-summary',
  standalone: true,
  template: `
    <section class="section-card">
      <h3>Diagnosis Summary</h3>
      <p>{{ text || 'Not Available' }}</p>
    </section>
  `,
  styles: [
    `
      .section-card {
        background: #fff;
        border: 1px solid #dbe5f3;
        border-radius: 16px;
        padding: 1rem;
      }

      h3 {
        margin: 0 0 0.5rem;
      }

      p {
        margin: 0;
        white-space: pre-wrap;
      }
    `
  ]
})
export class DiagnosisSummaryComponent {
  @Input({ required: true }) text = '';
}

