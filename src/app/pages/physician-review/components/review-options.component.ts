import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { ReviewOptionCard, ReviewOptionKey, ReviewOptions } from '../models';

@Component({
  selector: 'app-review-options',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="panel">
      <div class="panel-header">
        <h2>AI Package Configuration</h2>
        <p>Step 1: Choose up to two optional sections.</p>
      </div>

      <div class="tiles-grid">
        @for (option of options; track option.key) {
        <button
          type="button"
          class="tile"
          [class.selected]="isSelected(option.key)"
          [disabled]="isDisabled(option.key)"
          (click)="toggleOption(option.key)">
          <div class="tile-icon" aria-hidden="true">{{ option.icon }}</div>
          <div class="tile-content">
            <h3>{{ option.title }}</h3>
            <p>{{ option.description }}</p>
          </div>
          <span class="tile-check" [class.checked]="isSelected(option.key)">
            {{ isSelected(option.key) ? 'Selected' : 'Select' }}
          </span>
        </button>
        }
      </div>

      <p class="helper">Choose up to two optional sections.</p>
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

      .panel-header h2 {
        margin: 0;
        font-size: 1.2rem;
      }

      .panel-header p {
        margin: 0.35rem 0 1rem;
        color: #4e637f;
      }

      .tiles-grid {
        display: grid;
        gap: 0.8rem;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      }

      .tile {
        width: 100%;
        min-height: 120px;
        border: 1px solid #cfd9e7;
        border-radius: 12px;
        background: #fff;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        align-items: start;
        text-align: left;
        padding: 0.95rem;
        cursor: pointer;
        transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
      }

      .tile:hover:not(:disabled) {
        border-color: #8fb0df;
        box-shadow: 0 4px 12px rgba(25, 92, 197, 0.12);
        transform: translateY(-1px);
      }

      .tile.selected {
        border-color: #1e61d6;
        background: #eef5ff;
      }

      .tile:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .tile-icon {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        background: #f1f5fb;
        display: grid;
        place-items: center;
        font-size: 1.1rem;
        flex-shrink: 0;
      }

      .tile.selected .tile-icon {
        color: #1e61d6;
        background: #e3eeff;
      }

      .tile-content h3 {
        margin: 0 0 0.25rem;
        font-size: 0.88rem;
      }

      .tile-content p {
        margin: 0;
        font-size: 0.84rem;
        color: #42566f;
        line-height: 1.35;
      }

      .tile-check {
        align-self: start;
        font-size: 0.72rem;
        font-weight: 700;
        color: #516b8c;
        border: 1px solid #ccd6e5;
        border-radius: 999px;
        padding: 0.16rem 0.5rem;
      }

      .tile-check.checked {
        color: #fff;
        background: #1e61d6;
        border-color: #1e61d6;
      }

      .helper {
        margin: 0.95rem 0 0;
        font-size: 0.85rem;
        color: #5b6f86;
      }

      @media (max-width: 500px) {
        .tiles-grid {
          grid-template-columns: 1fr;
        }
      }
    `
  ]
})
export class ReviewOptionsComponent {
  @Input({ required: true }) options: ReviewOptionCard[] = [];
  @Input({ required: true }) selectedOptions: ReviewOptions = {
    includeDiagnosisSummary: false,
    includeHistoricalPatients: false,
    includeClinicalEvidence: false,
    draftPreAuthorizationLetter: false
  };
  @Input({ required: true }) maxSelections = 2;

  @Output() optionChanged = new EventEmitter<{ key: ReviewOptionKey; checked: boolean }>();

  isSelected(key: ReviewOptionKey): boolean {
    return this.selectedOptions[key];
  }

  isDisabled(key: ReviewOptionKey): boolean {
    const selectedCount = Object.values(this.selectedOptions).filter((value) => value).length;
    return !this.selectedOptions[key] && selectedCount >= this.maxSelections;
  }

  toggleOption(key: ReviewOptionKey): void {
    if (this.isDisabled(key)) {
      return;
    }

    this.optionChanged.emit({ key, checked: !this.selectedOptions[key] });
  }
}


