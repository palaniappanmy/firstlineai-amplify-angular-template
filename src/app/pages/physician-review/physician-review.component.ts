import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import {
  PhysicianApprovalRequest,
  PhysicianReviewGenerateRequest,
  PhysicianReviewViewModel,
  ReviewOptionCard,
  ReviewOptionKey,
  ReviewOptions
} from './models';
import { AuthorizationDraftComponent } from './components/authorization-draft.component';
import { ClinicalEvidenceComponent } from './components/clinical-evidence.component';
import { DiagnosisSummaryComponent } from './components/diagnosis-summary.component';
import { FooterActionsComponent } from './components/footer-actions.component';
import { HistoricalPatientsComponent } from './components/historical-patients.component';
import { MedicalNecessityComponent } from './components/medical-necessity.component';
import { PackagePreviewComponent } from './components/package-preview.component';
import { PhysicianInstructionsComponent } from './components/physician-instructions.component';
import { ReviewOptionsComponent } from './components/review-options.component';
import { TreatmentTimelineComponent } from './components/treatment-timeline.component';
import { PhysicianReviewService } from '../../services/physician-review.service';
import { JourneyHeaderComponent } from '../../components/journey-header.component';

@Component({
  selector: 'app-physician-review',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    JourneyHeaderComponent,
    ReviewOptionsComponent,
    PackagePreviewComponent,
    PhysicianInstructionsComponent,
    DiagnosisSummaryComponent,
    TreatmentTimelineComponent,
    ClinicalEvidenceComponent,
    HistoricalPatientsComponent,
    MedicalNecessityComponent,
    AuthorizationDraftComponent,
    FooterActionsComponent
  ],
  templateUrl: './physician-review.component.html',
  styleUrl: './physician-review.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PhysicianReviewComponent {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly reviewService = inject(PhysicianReviewService);

  readonly maxSelections = 2;
  readonly optionCards: ReviewOptionCard[] = [
    {
      key: 'includeDiagnosisSummary',
      title: 'Diagnosis Summary',
      description: 'Clinical overview for current diagnosis and risk context.',
      icon: '🩺'
    },
    {
      key: 'includeHistoricalPatients',
      title: 'Similar Historical Patients',
      description: 'Comparable patient cohorts with treatment outcomes.',
      icon: '👥'
    },
    {
      key: 'includeClinicalEvidence',
      title: 'Clinical Evidence',
      description: 'Guidelines and literature-backed supporting evidence.',
      icon: '📚'
    },
    {
      key: 'draftPreAuthorizationLetter',
      title: 'Draft Pre-Authorization Letter',
      description: 'Prepare an editable prior authorization letter draft.',
      icon: '✍'
    }
  ];

  readonly form = this.fb.nonNullable.group({
    patientId: ['', [Validators.required]],
    doctorInstructions: ['', [Validators.maxLength(1200)]]
  });

  readonly loadingGenerate = signal(false);
  readonly generateError = signal<string | null>(null);
  readonly generateSuccess = signal<string | null>(null);

  readonly reviewModel = signal<PhysicianReviewViewModel | null>(null);
  readonly approvalDraftText = signal('');

  readonly loadingApproval = signal(false);
  readonly approvalSuccess = signal<string | null>(null);
  readonly approvalError = signal<string | null>(null);
  readonly approvalTrackingId = signal('');

  readonly selectedOptions = signal<ReviewOptions>({
    includeDiagnosisSummary: false,
    includeHistoricalPatients: false,
    includeClinicalEvidence: false,
    draftPreAuthorizationLetter: false
  });

  readonly selectedCount = computed(() =>
    Object.values(this.selectedOptions()).filter((value) => value).length
  );

  readonly selectedOptionTitles = computed(() =>
    this.optionCards
      .filter((option) => this.selectedOptions()[option.key])
      .map((option) => option.title)
  );

  readonly estimatedGenerationSeconds = computed(() => 9 + this.selectedCount() * 3);
  readonly complexity = computed(() => {
    const count = this.selectedCount();
    if (count >= 2) {
      return 'High';
    }

    if (count === 1) {
      return 'Medium';
    }

    return 'Standard';
  });

  readonly canRequestApproval = computed(() => this.approvalDraftText().trim().length > 0);
  readonly hasGeneratedReview = computed(() => this.reviewModel() !== null);

  onOptionChanged(event: { key: ReviewOptionKey; checked: boolean }): void {
    const current = this.selectedOptions();
    const currentlySelected = current[event.key];

    if (!currentlySelected && this.selectedCount() >= this.maxSelections) {
      return;
    }

    this.selectedOptions.update((opts) => ({ ...opts, [event.key]: event.checked }));
  }

  generateReviewPackage(): void {
    if (this.form.controls.patientId.invalid || this.loadingGenerate()) {
      this.form.controls.patientId.markAsTouched();
      return;
    }

    const payload: PhysicianReviewGenerateRequest = {
      patientId: this.form.controls.patientId.value,
      doctorInstructions: this.form.controls.doctorInstructions.value,
      options: this.selectedOptions()
    };

    this.loadingGenerate.set(true);
    this.generateError.set(null);
    this.generateSuccess.set(null);
    this.approvalSuccess.set(null);
    this.approvalError.set(null);

    this.reviewService
      .generateReviewPackage(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingGenerate.set(false))
      )
      .subscribe({
        next: (review) => {
          this.reviewModel.set(review);
          this.approvalDraftText.set(review.preAuthorizationDraft);
          this.generateSuccess.set('Review package generated successfully.');
        },
        error: (error: Error) => {
          this.reviewModel.set(null);
          this.approvalDraftText.set('');
          this.generateError.set(error.message);
        }
      });
  }

  onDraftSaved(updatedDraft: string): void {
    this.approvalDraftText.set(updatedDraft);
    this.generateSuccess.set('Draft updated successfully.');
  }

  onDraftCancelled(): void {
    const original = this.reviewModel()?.preAuthorizationDraft ?? '';
    this.approvalDraftText.set(original);
  }

  requestApproval(): void {
    const review = this.reviewModel();
    const draft = this.approvalDraftText().trim();

    if (!review || !draft || this.loadingApproval()) {
      return;
    }

    const payload: PhysicianApprovalRequest = {
      patientId: this.form.controls.patientId.value,
      approvalLetter: draft,
      doctorInstructions: this.form.controls.doctorInstructions.value,
      reviewPackage: review.reviewPackage
    };

    this.loadingApproval.set(true);
    this.approvalError.set(null);
    this.approvalSuccess.set(null);
    this.approvalTrackingId.set('');

    this.reviewService
      .requestApproval(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingApproval.set(false))
      )
      .subscribe({
        next: (response) => {
          if (!response.success) {
            this.approvalError.set(response.message || 'Unable to submit approval request.');
            return;
          }

          this.approvalSuccess.set(response.message || 'Approval request submitted successfully.');
          this.approvalTrackingId.set(response.trackingId ?? 'Not Available');
        },
        error: (error: Error) => {
          this.approvalError.set(error.message);
        }
      });
  }

  onBack(): void {
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  }

  onRegenerate(): void {
    this.generateReviewPackage();
  }

  onSaveDraftFromFooter(): void {
    if (!this.canRequestApproval()) {
      return;
    }

    this.generateSuccess.set('Draft saved.');
  }

  isFieldInvalid(fieldName: 'patientId'): boolean {
    const control = this.form.controls[fieldName];
    return control.invalid && (control.touched || control.dirty);
  }

  decisionClass(decision: PhysicianReviewViewModel['recommendedDecision']): string {
    switch (decision) {
      case 'Approve':
        return 'decision-approve';
      case 'Pend':
        return 'decision-pend';
      case 'Deny':
        return 'decision-deny';
      default:
        return 'decision-unknown';
    }
  }
}
