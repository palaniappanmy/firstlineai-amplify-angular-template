import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { PayerDecision, PayerReviewViewModel } from './payer-review.models';
import { PayerReviewService } from '../../services/payer-review.service';

@Component({
  selector: 'app-payer-review',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './payer-review.component.html',
  styleUrl: './payer-review.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PayerReviewComponent {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly payerService = inject(PayerReviewService);

  readonly pullForm = this.fb.nonNullable.group({
    patientId: ['', [Validators.required]]
  });

  readonly decisionForm = this.fb.nonNullable.group({
    recommendedDrugs: [''],
    notes: ['']
  });

  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly viewModel = signal<PayerReviewViewModel | null>(null);
  readonly selectedDecision = signal<PayerDecision | null>(null);
  readonly decisionSuccess = signal<{ message: string; referenceId: string } | null>(null);
  readonly decisionError = signal<string | null>(null);

  readonly hasData = computed(() => this.viewModel() !== null);

  readonly recommendationClass = computed(() => {
    const rec = this.viewModel()?.priorAuthRecommendation?.toLowerCase() ?? '';
    if (rec.includes('approve')) return 'badge-approve';
    if (rec.includes('pend') || rec.includes('review')) return 'badge-review';
    if (rec.includes('deny')) return 'badge-deny';
    return 'badge-neutral';
  });

  readonly confidenceClass = computed(() => {
    const c = this.viewModel()?.confidenceLevel?.toLowerCase() ?? '';
    if (c.includes('high')) return 'badge-approve';
    if (c.includes('medium')) return 'badge-review';
    if (c.includes('low')) return 'badge-deny';
    return 'badge-neutral';
  });

  pullPreAuth(): void {
    if (this.pullForm.invalid || this.loading()) {
      this.pullForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);
    this.viewModel.set(null);
    this.selectedDecision.set(null);
    this.decisionSuccess.set(null);
    this.decisionError.set(null);

    this.payerService
      .pullPreAuthRequest(this.pullForm.controls.patientId.value)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (vm) => {
          this.viewModel.set(vm);
          this.success.set('Pre-authorization request loaded successfully.');
        },
        error: (err: Error) => {
          this.error.set(err.message);
        }
      });
  }

  selectDecision(decision: PayerDecision): void {
    this.selectedDecision.set(decision);
    this.decisionSuccess.set(null);
    this.decisionError.set(null);
    if (decision !== 'Review') {
      this.decisionForm.controls.recommendedDrugs.reset('');
    }
  }

  confirmDecision(): void {
    const decision = this.selectedDecision();
    if (!decision || this.submitting()) {
      return;
    }

    if (decision === 'Review' && !this.decisionForm.controls.recommendedDrugs.value.trim()) {
      this.decisionError.set('Please enter recommended drugs before confirming a Review decision.');
      return;
    }

    this.submitting.set(true);
    this.decisionError.set(null);

    this.payerService
      .submitDecision({
        patientId: this.pullForm.controls.patientId.value,
        decision,
        recommendedDrugs: this.decisionForm.controls.recommendedDrugs.value,
        notes: this.decisionForm.controls.notes.value
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.submitting.set(false))
      )
      .subscribe({
        next: (result) => {
          this.decisionSuccess.set({ message: result.message, referenceId: result.referenceId });
        },
        error: (err: Error) => {
          this.decisionError.set(err.message);
        }
      });
  }

  isFieldInvalid(field: 'patientId'): boolean {
    const control = this.pullForm.controls[field];
    return control.invalid && (control.touched || control.dirty);
  }
}

