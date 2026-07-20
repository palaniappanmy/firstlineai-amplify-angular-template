import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import {
  PhysicianApprovalRequest,
  PhysicianApprovalResponse,
  PhysicianReviewGenerateRequest,
  PhysicianReviewViewModel
} from '../pages/physician-review/models';
import { ReviewResponseMapperService } from './review-response-mapper.service';

@Injectable({
  providedIn: 'root'
})
export class PhysicianReviewService {
  private readonly http = inject(HttpClient);
  private readonly mapper = inject(ReviewResponseMapperService);

  private readonly generateUrl =
    'https://htle2qzs9g.execute-api.ap-southeast-2.amazonaws.com/mvp/analyze-patient';
  private readonly preAuthorizationUrl =
    'https://4hkd767sc5.execute-api.ap-southeast-2.amazonaws.com/mvp/analyze-patient';
  private readonly approvalUrl = `${environment.apiBaseUrl}/requestApproval`;

  generateReviewPackage(payload: PhysicianReviewGenerateRequest): Observable<PhysicianReviewViewModel> {
    return forkJoin({
      primary: this.postForViewModel(this.generateUrl, payload),
      // Keep the primary workflow usable if only the draft endpoint fails.
      preAuthorization: this.postForViewModel(this.preAuthorizationUrl, payload).pipe(
        catchError(() =>
          of({
            diagnosisSummary: 'Not Available',
            treatmentTimelineItems: [],
            treatmentTimelineNarrative: 'No information available.',
            clinicalEvidence: [],
            historicalPatients: [],
            historicalPatientsNarrative: 'No information available.',
            medicalNecessity: 'Not Available',
            recommendedDecision: 'Unknown',
            decisionConfidence: 'Unknown',
            preAuthorizationDraft: '',
            warnings: ['Unable to fetch pre-authorization draft from the secondary endpoint.'],
            reviewPackage: {}
          } as PhysicianReviewViewModel)
        )
      )
    }).pipe(
      map(({ primary, preAuthorization }) => {
        const mergedDraft = preAuthorization.preAuthorizationDraft || primary.preAuthorizationDraft;

        return {
          ...primary,
          preAuthorizationDraft: mergedDraft,
          warnings: [...primary.warnings, ...preAuthorization.warnings],
          reviewPackage: {
            ...primary.reviewPackage,
            preAuthorizationDraft: mergedDraft
          }
        };
      }),
      catchError((error: unknown) => throwError(() => this.toError(error)))
    );
  }

  private postForViewModel(
    url: string,
    payload: PhysicianReviewGenerateRequest
  ): Observable<PhysicianReviewViewModel> {
    return this.http.post(url, payload, { responseType: 'text' }).pipe(
      map((rawText) => {
        let parsed: unknown = rawText;
        try {
          parsed = JSON.parse(rawText);
        } catch {
          // plain text — keep as-is
        }

        return this.mapper.mapGenerateResponse(parsed);
      })
    );
  }

  requestApproval(payload: PhysicianApprovalRequest): Observable<PhysicianApprovalResponse> {
    return this.http.post(this.approvalUrl, payload, { responseType: 'text' }).pipe(
      map((rawText) => {
        let parsed: unknown = rawText;
        try {
          parsed = JSON.parse(rawText);
        } catch {
          parsed = rawText;
        }
        return this.normalizeApprovalResponse(parsed);
      }),
      catchError((error: unknown) => throwError(() => this.toError(error)))
    );
  }

  private normalizeApprovalResponse(response: unknown): PhysicianApprovalResponse {
    if (typeof response === 'string') {
      return { success: true, message: response };
    }

    if (!this.isRecord(response)) {
      return { success: false, message: 'Unable to interpret approval response.' };
    }

    const success = typeof response['success'] === 'boolean' ? response['success'] : true;
    const message =
      this.readString(response, ['message']) ??
      (success ? 'Approval request submitted successfully.' : 'Unable to submit approval request.');
    const trackingId = this.readString(response, ['trackingId', 'tracking_id', 'requestId', 'request_id']);

    return { success, message, trackingId };
  }

  private toError(error: unknown): Error {
    if (error instanceof HttpErrorResponse) {
      const body = error.error;
      if (this.isRecord(body)) {
        const bodyMessage = this.readString(body, ['message', 'error']);
        if (bodyMessage) {
          return new Error(bodyMessage);
        }
      }

      if (typeof body === 'string' && body.trim().length > 0) {
        return new Error(body.trim());
      }

      return new Error('Request failed. Please try again.');
    }

    if (error instanceof Error) {
      return error;
    }

    return new Error('Unexpected error occurred.');
  }

  private readString(source: Record<string, unknown>, keys: string[]): string | undefined {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }

    return undefined;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
