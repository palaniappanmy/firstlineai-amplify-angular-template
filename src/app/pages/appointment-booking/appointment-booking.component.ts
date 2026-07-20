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
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { finalize } from 'rxjs/operators';

import {
  AIInsights,
  Assessment,
  Keyword,
  PatientAnalysisResponse,
  PatientSummary,
  RiskLevel
} from '../../models/patient-analysis.models';
import { PatientAnalysisService } from '../../services/patient-analysis.service';
import { JourneyHeaderComponent } from '../../components/journey-header.component';

@Component({
  selector: 'app-appointment-booking',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule, JourneyHeaderComponent],
  templateUrl: './appointment-booking.component.html',
  styleUrl: './appointment-booking.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppointmentBookingComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly patientAnalysisService = inject(PatientAnalysisService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly selectedFileName = signal('No file selected');
  readonly successBanner = signal<string | null>(null);
  readonly errorBanner = signal<string | null>(null);
  readonly response = signal<PatientAnalysisResponse | null>(null);
  readonly completedAt = signal<string | null>(null);

  readonly appointmentForm = this.formBuilder.nonNullable.group({
    patientName: ['', Validators.required],
    appointmentDate: ['', Validators.required],
    appointmentTime: ['', Validators.required],
    physician: ['Dr. Smith', Validators.required],
    medicalHistoryFile: [null as File | null, Validators.required]
  });

  readonly hasResult = computed(() => this.response() !== null);

  readonly insights = computed<AIInsights | null>(() => {
    return this.response()?.aiInsights?.aiInsights ?? null;
  });

  readonly patientSummary = computed<PatientSummary | null>(() => {
    const currentResponse = this.response();
    if (!currentResponse) {
      return null;
    }

    return {
      patientId: currentResponse.patientId ?? 'N/A',
      storageStatus: currentResponse.stored ? 'Successfully Stored' : 'Not Stored',
      analysisStatus: currentResponse.success ? 'Completed' : 'Failed',
      timestamp: currentResponse.timestamp ?? this.completedAt() ?? new Date().toISOString()
    };
  });

  readonly trajectorySteps = computed<string[]>(() => {
    const trajectory = this.insights()?.clinicalTrajectory ?? '';
    if (!trajectory) {
      return [];
    }

    return trajectory
      .split(/\s*(?:->|→|↓|\n|\|)\s*/g)
      .map((step) => step.trim())
      .filter((step) => step.length > 0);
  });

  readonly assessmentCards = computed<Assessment[]>(() => {
    const currentInsights = this.insights();
    if (!currentInsights) {
      return [];
    }

    return [
      {
        title: 'Therapy Stage',
        value: currentInsights.therapyStage || 'Unknown',
        level: this.toRiskLevel(currentInsights.therapyStage)
      },
      {
        title: 'Clinical Complexity',
        value: currentInsights.clinicalComplexity || 'Unknown',
        level: this.toRiskLevel(currentInsights.clinicalComplexity)
      },
      {
        title: 'Prior Authorization Likelihood',
        value: currentInsights.priorAuthorizationLikelihood || 'Unknown',
        level: this.toRiskLevel(currentInsights.priorAuthorizationLikelihood)
      }
    ];
  });

  readonly keywords = computed<Keyword[]>(() => {
    const currentKeywords = this.insights()?.recommendedSearchKeywords ?? [];
    return currentKeywords.map((value) => ({ value }));
  });

  onFileSelected(event: Event): void {
    const inputElement = event.target as HTMLInputElement | null;
    const selectedFile = inputElement?.files?.[0] ?? null;

    this.appointmentForm.controls.medicalHistoryFile.setValue(selectedFile);
    this.appointmentForm.controls.medicalHistoryFile.markAsTouched();
    this.selectedFileName.set(selectedFile?.name ?? 'No file selected');

    this.errorBanner.set(null);
    this.successBanner.set(null);
  }

  analyzePatient(): void {
    if (this.appointmentForm.invalid || this.loading()) {
      this.appointmentForm.markAllAsTouched();
      return;
    }

    const file = this.appointmentForm.controls.medicalHistoryFile.value;
    if (!file) {
      return;
    }

    this.loading.set(true);
    this.errorBanner.set(null);
    this.successBanner.set(null);

    this.patientAnalysisService
      .analyzePatient(file)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (analysisResponse) => {
          this.response.set(analysisResponse);
          this.completedAt.set(new Date().toISOString());
          this.successBanner.set('Analysis completed successfully');
        },
        error: (error: Error) => {
          this.errorBanner.set(error.message);
          this.response.set(null);
          this.completedAt.set(null);
        }
      });
  }

  isFieldInvalid(fieldName: keyof typeof this.appointmentForm.controls): boolean {
    const control = this.appointmentForm.controls[fieldName];
    return control.invalid && (control.touched || control.dirty);
  }

  trackByAssessmentTitle(_: number, assessment: Assessment): string {
    return assessment.title;
  }

  trackByKeyword(_: number, keyword: Keyword): string {
    return keyword.value;
  }

  toRiskLevel(value: string): RiskLevel {
    const normalizedValue = value?.trim().toLowerCase();

    if (normalizedValue === 'low') {
      return 'Low';
    }

    if (normalizedValue === 'medium') {
      return 'Medium';
    }

    if (normalizedValue === 'high') {
      return 'High';
    }

    return 'Unknown';
  }

  riskClass(level: RiskLevel): string {
    switch (level) {
      case 'Low':
        return 'risk-low';
      case 'Medium':
        return 'risk-medium';
      case 'High':
        return 'risk-high';
      default:
        return 'risk-default';
    }
  }
}
