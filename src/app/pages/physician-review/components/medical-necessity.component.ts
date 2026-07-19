import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-medical-necessity',
  standalone: true,
  template: `
    <section class="section-card">
      <h3>Medical Necessity</h3>
      <article class="doc-panel">
        <p>{{ text || 'Not Available' }}</p>
      </article>
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

      .doc-panel {
        background: #fcfdff;
        border: 1px solid #e4ebf5;
        border-radius: 12px;
        padding: 1rem;
        box-shadow: inset 0 0 0 1px #f3f6fb;
      }

      p {
        margin: 0;
        white-space: pre-wrap;
        line-height: 1.6;
      }
    `
  ]
})
export class MedicalNecessityComponent {
  @Input({ required: true }) text = '';
}


