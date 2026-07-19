import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

import { HistoricalPatientRow } from '../models';

@Component({
  selector: 'app-historical-patients',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="section-card">
      <h3>Similar Historical Patients</h3>

      @if (rows.length > 0) {
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Patient</th>
              <th>Similarity</th>
              <th>Outcome</th>
              <th>Age</th>
              <th>Treatment</th>
              <th>Response</th>
            </tr>
          </thead>
          <tbody>
            @for (row of rows; track row.patient + row.similarity + row.outcome) {
            <tr>
              <td>{{ row.patient }}</td>
              <td>
                <span class="similarity-badge" [class.high]="isHighSimilarity(row.similarity)">
                  {{ row.similarity }}
                </span>
              </td>
              <td>{{ row.outcome }}</td>
              <td>{{ row.age }}</td>
              <td>{{ row.treatment }}</td>
              <td>{{ row.response }}</td>
            </tr>
            }
          </tbody>
        </table>
      </div>
      } @else if (narrative) {
      <p>{{ narrative }}</p>
      } @else {
      <p>No comparable historical patients identified.</p>
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

      .table-wrap {
        overflow-x: auto;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        min-width: 820px;
      }

      th,
      td {
        border-bottom: 1px solid #e0e7f2;
        padding: 0.5rem;
        text-align: left;
        font-size: 0.9rem;
      }

      th {
        background: #f5f8fd;
        color: #344d6b;
      }

      .similarity-badge {
        display: inline-block;
        border-radius: 999px;
        padding: 0.15rem 0.5rem;
        background: #eaf0fa;
        color: #3f5b7b;
        font-size: 0.75rem;
        font-weight: 700;
      }

      .similarity-badge.high {
        background: #e8f7ee;
        color: #157347;
      }
    `
  ]
})
export class HistoricalPatientsComponent {
  @Input({ required: true }) rows: HistoricalPatientRow[] = [];
  @Input({ required: true }) narrative = '';

  isHighSimilarity(value: string): boolean {
    const numeric = Number(value.replace(/[^0-9.]/g, ''));
    return !Number.isNaN(numeric) && numeric >= 80;
  }
}


