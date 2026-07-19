import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-physician-instructions',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <section class="panel">
      <h2>Clinical Instructions</h2>
      <p class="subtitle">Step 2: Guide AI to focus on important clinical considerations.</p>
      <textarea
        rows="8"
        [maxlength]="maxLength"
        [formControl]="control"
        placeholder="Patient experienced treatment failure after topical therapy.&#10;&#10;Please emphasize medical necessity and biologic escalation."></textarea>
      <div class="footer-row">
        <p class="helper">These instructions are used only for this review package.</p>
        <p class="counter">{{ control.value.length }} / {{ maxLength }}</p>
      </div>
    </section>
  `,
  styles: [
    `
      .panel {
        background: #fff;
        border: 1px solid #d8e2ef;
        border-radius: 16px;
        padding: 1.5rem;
        box-shadow: 0 1px 2px rgba(18, 52, 102, 0.08);
      }

      h2 {
        margin: 0;
        font-size: 1.2rem;
      }

      .subtitle {
        margin: 0.35rem 0 0.95rem;
        color: #4f647c;
      }

      textarea {
        width: 100%;
        min-height: 180px;
        border: 1px solid #bfcee2;
        border-radius: 10px;
        padding: 0.9rem;
        resize: vertical;
        line-height: 1.45;
      }

      .footer-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin-top: 0.5rem;
      }

      .helper {
        margin: 0;
        font-size: 0.82rem;
        color: #5a6f86;
      }

      .counter {
        margin: 0;
        font-size: 0.82rem;
        color: #5a6f86;
      }

      @media (max-width: 720px) {
        .footer-row {
          flex-direction: column;
          align-items: flex-start;
        }
      }
    `
  ]
})
export class PhysicianInstructionsComponent {
  @Input({ required: true }) control = new FormControl<string>('', { nonNullable: true });
  @Input() maxLength = 1200;
}


