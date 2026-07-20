import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';

interface JourneyStep {
  route: string;
  icon: string;
  shortLabel: string;
  fullLabel: string;
}

@Component({
  selector: 'app-journey-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="journey-header">
      <div class="brand-row">
        <div class="brand-wrap">
          <span class="brand-mark" aria-hidden="true">+</span>
          <div class="brand-copy">
            <div class="brand">FirstLine <span>AI</span></div>
            <div class="brand-subtitle">Clinical Prior Authorization Navigator</div>
          </div>
        </div>
        <span class="workspace-pill">Care Journey</span>
      </div>

      <nav class="journey-nav" aria-label="Care journey navigation">
        <a
          *ngFor="let step of steps; let i = index"
          class="journey-link"
          [routerLink]="step.route"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: true }">
          <span class="step-index">{{ i + 1 }}</span>
          <span class="step-icon" aria-hidden="true">{{ step.icon }}</span>
          <span class="step-labels">
            <span class="short">{{ step.shortLabel }}</span>
            <span class="full">{{ step.fullLabel }}</span>
          </span>
        </a>
      </nav>
    </header>
  `,
  styles: [
    `
      :host {
        display: block;
        position: sticky;
        top: 0;
        z-index: 100;
      }

      .journey-header {
        background: #0c2d6b;
        color: #fff;
        border-bottom: 1px solid rgba(255, 255, 255, 0.18);
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.16);
        padding: 0.75rem clamp(0.9rem, 3vw, 1.7rem);
        display: grid;
        gap: 0.65rem;
      }

      .brand-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        flex-wrap: wrap;
      }

      .brand-wrap {
        display: flex;
        align-items: center;
        gap: 0.6rem;
      }

      .brand-mark {
        width: 1.45rem;
        height: 1.45rem;
        border-radius: 50%;
        background: #7aaeff;
        color: #0c2d6b;
        display: inline-grid;
        place-items: center;
        font-weight: 800;
        line-height: 1;
      }

      .brand {
        font-size: 1.06rem;
        font-weight: 800;
        letter-spacing: -0.01em;
      }

      .brand span {
        color: #9bc2ff;
      }

      .brand-subtitle {
        font-size: 0.7rem;
        color: #d7e7ff;
        letter-spacing: 0.03em;
        text-transform: uppercase;
      }

      .workspace-pill {
        font-size: 0.78rem;
        letter-spacing: 0.03em;
        text-transform: uppercase;
        border: 1px solid rgba(255, 255, 255, 0.25);
        background: rgba(255, 255, 255, 0.1);
        padding: 0.2rem 0.6rem;
        border-radius: 999px;
        color: #d9e8ff;
      }

      .journey-nav {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 0.45rem;
      }

      .journey-link {
        display: flex;
        align-items: center;
        gap: 0.55rem;
        text-decoration: none;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.08);
        padding: 0.45rem 0.6rem;
        color: #e4efff;
        min-height: 54px;
        transition: background 0.18s, border-color 0.18s, transform 0.14s;
      }

      .journey-link:hover {
        background: rgba(255, 255, 255, 0.14);
        border-color: rgba(255, 255, 255, 0.34);
        transform: translateY(-1px);
      }

      .journey-link.active {
        background: #ffffff;
        color: #0f2f68;
        border-color: #ffffff;
      }

      .step-index {
        width: 1.3rem;
        height: 1.3rem;
        border-radius: 50%;
        display: inline-grid;
        place-items: center;
        font-size: 0.72rem;
        font-weight: 700;
        flex-shrink: 0;
        background: rgba(255, 255, 255, 0.22);
      }

      .journey-link.active .step-index {
        background: #d9e7ff;
      }

      .step-icon {
        font-size: 0.95rem;
        line-height: 1;
        width: 1.1rem;
        text-align: center;
        flex-shrink: 0;
      }

      .step-labels {
        display: grid;
      }

      .step-labels .short {
        font-size: 0.8rem;
        font-weight: 700;
      }

      .step-labels .full {
        font-size: 0.68rem;
        opacity: 0.88;
        line-height: 1.15;
      }

      @media (max-width: 960px) {
        .journey-nav {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 560px) {
        .journey-nav {
          grid-template-columns: 1fr;
        }

        .brand-subtitle {
          display: none;
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JourneyHeaderComponent {
  readonly steps: JourneyStep[] = [
    {
      route: '/appointment-booking',
      icon: '📅',
      shortLabel: 'Appointment Booking',
      fullLabel: 'Intake and schedule request'
    },
    {
      route: '/physician-review',
      icon: '🩺',
      shortLabel: 'Physician Review',
      fullLabel: 'Pre-Authorization request package'
    },
    {
      route: '/payer-review',
      icon: '📋',
      shortLabel: 'Payer Review',
      fullLabel: 'Pre-Authorization coverage review'
    },
    {
      route: '/history-insights',
      icon: '📊',
      shortLabel: 'History Insights',
      fullLabel: 'Statistics and risk assessment'
    }
  ];
}
