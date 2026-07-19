import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { PatientAnalysisResponse } from '../models/patient-analysis.models';

@Injectable({
  providedIn: 'root'
})
export class PatientAnalysisService {
  private readonly analyzePatientUrl = `${environment.apiBaseUrl}/analyze-patient`;

  constructor(private readonly http: HttpClient) {}

  analyzePatient(file: File): Observable<PatientAnalysisResponse> {
    return this.uploadPatientHistory(file);
  }

  uploadPatientHistory(file: File): Observable<PatientAnalysisResponse> {
    return this.postJsonPayload(file).pipe(
      catchError((jsonError: unknown) => {
        if (!(jsonError instanceof HttpErrorResponse) || !this.shouldRetryWithMultipart(jsonError)) {
          return throwError(() => this.toError(jsonError));
        }

        const formData = new FormData();
        formData.append('medicalHistory', file, file.name);

        return this.http.post<PatientAnalysisResponse>(this.analyzePatientUrl, formData).pipe(
          map((response) => this.normalizeResponse(response)),
          switchMap((response) => this.ensureSuccessResponse(response)),
          catchError((multipartError: unknown) => throwError(() => this.toError(multipartError)))
        );
      })
    );
  }

  private postJsonPayload(file: File): Observable<PatientAnalysisResponse> {
    return from(file.text()).pipe(
      switchMap((rawContent) => {
        const payload = this.toJsonPayload(rawContent);
        return this.http
          .post<PatientAnalysisResponse>(this.analyzePatientUrl, payload)
          .pipe(map((response) => this.normalizeResponse(response)));
      }),
      switchMap((response) => this.ensureSuccessResponse(response))
    );
  }

  private ensureSuccessResponse(
    response: PatientAnalysisResponse
  ): Observable<PatientAnalysisResponse> {
    if (response.success) {
      return from([response]);
    }

    return throwError(() => new Error(this.getResponseErrorMessage(response)));
  }

  private normalizeResponse(response: PatientAnalysisResponse): PatientAnalysisResponse {
    const flattenedInsights = response.aiInsights?.aiInsights;
    return {
      ...response,
      aiInsights: {
        aiInsights: flattenedInsights
      }
    };
  }

  private shouldRetryWithMultipart(error: HttpErrorResponse): boolean {
    return error.status === 400 || error.status === 415 || error.status === 422;
  }

  private shouldRetryAfterSoftFailure(response: PatientAnalysisResponse): boolean {
    if (response.success) {
      return false;
    }

    const combined = `${response.error ?? ''} ${response.message ?? ''}`.toLowerCase();
    return (
      combined.includes('expecting value') ||
      combined.includes('line 1 column 1') ||
      combined.includes('unexpected error occurred')
    );
  }

  private getResponseErrorMessage(response: PatientAnalysisResponse): string {
    const message = response.error?.trim() || response.message?.trim();
    return message && message.length > 0
      ? message
      : 'Patient analysis failed. Please try again.';
  }

  private toJsonPayload(rawContent: string): { patientHistory: unknown } {
    try {
      const parsed = JSON.parse(rawContent) as unknown;
      return { patientHistory: parsed };
    } catch {
      throw new Error('The uploaded file is not valid JSON.');
    }
  }

  private toError(error: unknown): Error {
    if (error instanceof HttpErrorResponse) {
      const apiMessage = this.extractApiErrorMessage(error.error);
      return new Error(apiMessage ?? 'Patient analysis failed. Please try again.');
    }

    if (error instanceof Error) {
      return error;
    }

    return new Error('Unexpected error while analyzing the patient.');
  }

  private extractApiErrorMessage(errorBody: unknown): string | null {
    if (!this.isRecord(errorBody)) {
      return null;
    }

    const messageValue = errorBody['message'];
    if (typeof messageValue === 'string' && messageValue.trim().length > 0) {
      return messageValue;
    }

    const errorValue = errorBody['error'];
    if (typeof errorValue === 'string' && errorValue.trim().length > 0) {
      return errorValue;
    }

    return null;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}

