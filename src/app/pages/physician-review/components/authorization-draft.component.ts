import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, signal } from '@angular/core';

@Component({
  selector: 'app-authorization-draft',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="draft-shell">
      @if (!draftText) {
      <p class="empty-msg">No pre-authorization draft available. Generate a package with the Draft Pre-Authorization Letter option enabled.</p>
      } @else {

      <!-- Toolbar -->
      <div class="toolbar">
        @if (!isEditing()) {
          <button type="button" class="toolbar-btn" (click)="startEditing()">✏ Edit</button>
        }
        <button type="button" class="toolbar-btn" (click)="copyDraft()">⎘ Copy</button>
        <button type="button" class="toolbar-btn" (click)="downloadPdf()">⬇ Download</button>
        <button type="button" class="toolbar-btn" (click)="toggleExpand()">{{ expanded() ? '⊖ Collapse' : '⊕ Expand' }}</button>
        <button type="button" class="toolbar-btn" (click)="printDraft()">⎙ Print</button>
      </div>

      <!-- Document view (read-only) -->
      @if (!isEditing()) {
        <div class="letter-viewer" [class.expanded]="expanded()">
          @for (block of letterBlocks(); track block.heading + block.body) {
            @if (block.isHeading) {
              <p class="letter-heading">{{ block.heading }}</p>
            } @else if (block.isDivider) {
              <hr class="letter-divider" />
            } @else {
              <p class="letter-body" [class.bullet]="block.isBullet">{{ block.body }}</p>
            }
          }
        </div>
      }

      <!-- Edit mode -->
      @if (isEditing()) {
        <div class="editor-actions top-actions">
          <button type="button" class="btn-primary" (click)="save()">✔ Save Draft</button>
          <button type="button" class="btn-secondary" (click)="cancel()">✕ Cancel</button>
        </div>
        <textarea
          class="editor-area"
          [class.expanded]="expanded()"
          [value]="workingDraft()"
          (input)="updateWorkingDraft($event)"
          spellcheck="false"></textarea>
      }

      @if (statusMessage()) {
        <p class="status-msg">{{ statusMessage() }}</p>
      }

      <!-- Bottom actions -->
      <div class="bottom-actions">
        <button type="button" class="btn-secondary" (click)="save()" [disabled]="!isEditing()">Save Draft</button>
        <button type="button" class="btn-primary" [disabled]="!workingDraft().trim()" (click)="requestApproval.emit()">
          ✓ Request Approval
        </button>
      </div>
      }
    </section>
  `,
  styles: [`
    .draft-shell {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .empty-msg {
      color: #5a7088;
      font-size: 0.9rem;
      padding: 0.5rem 0;
    }

    /* Toolbar */
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
    }

    .toolbar-btn {
      font-size: 0.8rem;
      padding: 0.35rem 0.7rem;
      border: 1px solid #c4d3e6;
      border-radius: 7px;
      background: #f8fbff;
      color: #2c4a6a;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
    }

    .toolbar-btn:hover {
      background: #e8f1ff;
      border-color: #7aaeff;
    }

    /* Letter viewer */
    .letter-viewer {
      background: #fff;
      border: 1px solid #d8e6f5;
      border-radius: 10px;
      padding: 1.5rem 2rem;
      min-height: clamp(260px, 38vh, 480px);
      max-height: clamp(480px, 52vh, 640px);
      overflow-y: auto;
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: 0.92rem;
      line-height: 1.65;
      color: #1a2e47;
      box-shadow: inset 0 0 0 1px rgba(30,97,214,0.04);
    }

    .letter-viewer.expanded {
      max-height: clamp(640px, 72vh, 960px);
    }

    .letter-heading {
      font-family: 'Inter', 'Segoe UI', sans-serif;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.09em;
      color: #1e61d6;
      margin: 1rem 0 0.25rem;
      text-transform: uppercase;
    }

    .letter-body {
      margin: 0 0 0.4rem;
      color: #1a2e47;
    }

    .letter-body.bullet {
      padding-left: 0.5rem;
      color: #2f4965;
    }

    .letter-divider {
      border: none;
      border-top: 1px solid #d4e4f7;
      margin: 0.75rem 0;
    }

    /* Edit mode */
    .top-actions {
      margin-bottom: 0.35rem;
    }

    .editor-area {
      width: 100%;
      min-height: clamp(280px, 40vh, 520px);
      border: 1px solid #bfcfe4;
      border-radius: 10px;
      padding: 1rem 1.25rem;
      resize: vertical;
      font-family: 'Courier New', monospace;
      font-size: 0.88rem;
      line-height: 1.55;
      background: #fffffe;
      color: #1a2e47;
    }

    .editor-area.expanded {
      min-height: clamp(480px, 60vh, 720px);
    }

    .editor-actions,
    .top-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .bottom-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.6rem;
      flex-wrap: wrap;
    }

    .btn-primary {
      background: #1e61d6;
      color: #fff;
      border: 1px solid #1e61d6;
      border-radius: 8px;
      padding: 0.5rem 1rem;
      font-weight: 600;
    }

    .btn-primary:hover:not(:disabled) {
      background: #1750bb;
    }

    .btn-secondary {
      background: #fff;
      color: #1e3a5f;
      border: 1px solid #bfcfe4;
      border-radius: 8px;
      padding: 0.5rem 1rem;
    }

    .status-msg {
      font-size: 0.82rem;
      color: #0d6e35;
    }
  `]
})
export class AuthorizationDraftComponent implements OnChanges {
  @Input({ required: true }) draftText = '';

  @Output() saveDraft = new EventEmitter<string>();
  @Output() cancelEdit = new EventEmitter<void>();
  @Output() requestApproval = new EventEmitter<void>();

  readonly isEditing = signal(false);
  readonly expanded = signal(false);
  readonly workingDraft = signal('');
  readonly statusMessage = signal('');

  readonly letterBlocks = signal<LetterBlock[]>([]);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['draftText']) {
      const text = this.draftText ?? '';
      this.workingDraft.set(text);
      this.letterBlocks.set(this.parseLetterBlocks(text));
      this.isEditing.set(false);
    }
  }

  startEditing(): void {
    this.statusMessage.set('');
    this.isEditing.set(true);
  }

  updateWorkingDraft(event: Event): void {
    const target = event.target as HTMLTextAreaElement | null;
    const value = target?.value ?? '';
    this.workingDraft.set(value);
    this.letterBlocks.set(this.parseLetterBlocks(value));
  }

  save(): void {
    this.saveDraft.emit(this.workingDraft());
    this.isEditing.set(false);
    this.statusMessage.set('Draft saved successfully.');
  }

  cancel(): void {
    const original = this.draftText ?? '';
    this.workingDraft.set(original);
    this.letterBlocks.set(this.parseLetterBlocks(original));
    this.isEditing.set(false);
    this.cancelEdit.emit();
    this.statusMessage.set('');
  }

  toggleExpand(): void {
    this.expanded.set(!this.expanded());
  }

  async copyDraft(): Promise<void> {
    const text = this.workingDraft();
    if (!text) {
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      this.statusMessage.set('Copied to clipboard.');
    }
  }

  downloadPdf(): void {
    this.openPrintWindow(false);
  }

  printDraft(): void {
    this.openPrintWindow(true);
  }

  private openPrintWindow(shouldPrint: boolean): void {
    const text = this.workingDraft();
    if (!text || typeof window === 'undefined') {
      return;
    }

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      this.statusMessage.set('Unable to open print window.');
      return;
    }

    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    win.document.write(`<html><head><title>Pre-Authorization Draft</title>
      <style>body{font-family:Georgia,serif;font-size:13px;line-height:1.6;max-width:750px;margin:2rem auto;color:#1a2e47}
      pre{white-space:pre-wrap;word-break:break-word}</style></head>
      <body><pre>${escaped}</pre></body></html>`);
    win.document.close();

    if (shouldPrint) {
      win.print();
      this.statusMessage.set('Print dialog opened.');
    } else {
      this.statusMessage.set('Opened for Save as PDF.');
    }
  }

  private parseLetterBlocks(text: string): LetterBlock[] {
    const blocks: LetterBlock[] = [];

    for (const rawLine of text.split('\n')) {
      const line = rawLine;

      if (!line.trim()) {
        continue;
      }

      // Divider line (━ or ─ repeated)
      if (/^[━─=]{4,}/.test(line.trim())) {
        blocks.push({ isHeading: false, isDivider: true, isBullet: false, heading: '', body: '' });
        continue;
      }

      // ALL-CAPS heading (3+ chars, no lowercase letters)
      if (/^[A-Z][A-Z0-9 '&\-:]{2,}$/.test(line.trim()) && !/[a-z]/.test(line)) {
        blocks.push({ isHeading: true, isDivider: false, isBullet: false, heading: line.trim(), body: '' });
        continue;
      }

      // Bullet point
      if (/^\s*[•\-\*]\s/.test(line)) {
        blocks.push({ isHeading: false, isDivider: false, isBullet: true, heading: '', body: line.trim() });
        continue;
      }

      blocks.push({ isHeading: false, isDivider: false, isBullet: false, heading: '', body: line });
    }

    return blocks;
  }
}

interface LetterBlock {
  isHeading: boolean;
  isDivider: boolean;
  isBullet: boolean;
  heading: string;
  body: string;
}
