import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-footer-actions',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="sticky-bar">
      <div class="left-actions">
        <button type="button" (click)="back.emit()">Back</button>
        <button type="button" (click)="regenerate.emit()">Regenerate</button>
        <button type="button" (click)="saveDraft.emit()" [disabled]="!canRequestApproval">Save Draft</button>
      </div>

      <div class="right-actions">
      <button
        class="primary"
        type="button"
        [disabled]="!canRequestApproval || isRequesting"
        (click)="requestApproval.emit()">
        @if (isRequesting) {
        Requesting Approval...
        } @else {
        Request Approval
        }
      </button>
      </div>

      @if (successMessage || errorMessage) {
      <div class="status-row">
        @if (successMessage) {
        <div class="success">
          <p>{{ successMessage }}</p>
          @if (trackingId) {
          <p><strong>Tracking ID:</strong> {{ trackingId }}</p>
          }
        </div>
        }

        @if (errorMessage) {
        <p class="error">{{ errorMessage }}</p>
        }
      </div>
      }
    </section>
  `,
  styles: [
    `
      .sticky-bar {
        position: sticky;
        bottom: 0;
        z-index: 12;
        background: #fff;
        border: 1px solid #d8e2ef;
        border-radius: 16px;
        padding: 1rem;
        box-shadow: 0 -2px 12px rgba(19, 42, 78, 0.08);
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 0.75rem 1rem;
        flex-wrap: wrap;
        align-items: center;
      }

      .left-actions,
      .right-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      button {
        border: 1px solid #cad6e6;
        border-radius: 8px;
        background: #fff;
        padding: 0.55rem 0.85rem;
      }

      .primary {
        background: #1e61d6;
        color: #fff;
        border: 1px solid #1e61d6;
        border-radius: 8px;
        padding: 0.65rem 1rem;
        font-weight: 600;
      }

      .primary:disabled {
        opacity: 0.5;
      }

      .success {
        margin-top: 0.75rem;
        background: #e8f8ee;
        border: 1px solid #9ad8ac;
        border-radius: 8px;
        padding: 0.65rem;
      }

      .status-row {
        grid-column: 1 / -1;
      }

      .error {
        margin-top: 0.75rem;
        color: #842029;
      }

      @media (max-width: 680px) {
        .sticky-bar {
          grid-template-columns: 1fr;
        }
      }
    `
  ]
})
export class FooterActionsComponent {
  @Input({ required: true }) canRequestApproval = false;
  @Input({ required: true }) isRequesting = false;
  @Input() successMessage = '';
  @Input() trackingId = '';
  @Input() errorMessage = '';

  @Output() back = new EventEmitter<void>();
  @Output() regenerate = new EventEmitter<void>();
  @Output() saveDraft = new EventEmitter<void>();
  @Output() requestApproval = new EventEmitter<void>();
}


