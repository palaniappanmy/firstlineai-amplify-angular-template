import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-package-preview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="preview-card">
      <div class="header">
        <h2>Package Preview</h2>
        <span class="pill">Live</span>
      </div>

      <div class="preview-stack">
        <p class="line"><span aria-hidden="true">📄</span> Standard Review Package</p>
        @for (title of selectedOptionTitles; track title) {
        <p class="line"><span aria-hidden="true">+</span> {{ title }}</p>
        }
        @if (selectedOptionTitles.length === 0) {
        <p class="line muted">No optional sections selected.</p>
        }
      </div>

      <div class="meta-grid">
        <div>
          <p class="meta-label">Estimated generation time</p>
          <p class="meta-value">{{ estimatedSeconds }} seconds</p>
        </div>
        <div>
          <p class="meta-label">Complexity</p>
          <p class="meta-value">{{ complexity }}</p>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .preview-card {
        background: #fff;
        border: 1px solid #d8e2ef;
        border-radius: 16px;
        padding: 1.5rem;
        box-shadow: 0 1px 2px rgba(18, 52, 102, 0.08);
      }

      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1rem;
      }

      h2 {
        margin: 0;
        font-size: 1.2rem;
      }

      .pill {
        font-size: 0.75rem;
        font-weight: 700;
        color: #1e61d6;
        background: #eaf1ff;
        border-radius: 999px;
        padding: 0.2rem 0.55rem;
      }

      .preview-stack {
        background: #f6f9ff;
        border-radius: 12px;
        border: 1px solid #dce7fa;
        padding: 0.85rem;
        margin-bottom: 1rem;
      }

      .line {
        margin: 0 0 0.3rem;
        color: #1f3045;
      }

      .line.muted {
        color: #5c718a;
      }

      .meta-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.8rem;
      }

      .meta-label {
        margin: 0;
        font-size: 0.78rem;
        color: #5a6e86;
      }

      .meta-value {
        margin: 0.25rem 0 0;
        font-weight: 600;
        color: #223b5f;
      }
    `
  ]
})
export class PackagePreviewComponent {
  @Input({ required: true }) selectedOptionTitles: string[] = [];
  @Input({ required: true }) estimatedSeconds = 15;
  @Input({ required: true }) complexity = 'Standard';
}


