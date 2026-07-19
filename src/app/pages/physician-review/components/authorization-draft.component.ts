import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, signal } from '@angular/core';

@Component({
  selector: 'app-authorization-draft',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="section-card">
      <h3>Pre-Authorization Draft</h3>

      @if (!draftText) {
      <p>No information available.</p>
      } @else {
      <div class="toolbar">
        @if (!isEditing()) {
        <button type="button" (click)="startEditing()">Edit</button>
        }
        <button type="button" (click)="copyDraft()">Copy</button>
        <button type="button" (click)="downloadPdf()">Download PDF</button>
        <button type="button" (click)="toggleExpand()">{{ expanded() ? 'Collapse' : 'Expand' }}</button>
        <button type="button" (click)="printDraft()">Print</button>
      </div>

      <textarea
        [rows]="expanded() ? 20 : 14"
        [class.expanded]="expanded()"
        [readOnly]="!isEditing()"
        [value]="workingDraft()"
        (input)="updateWorkingDraft($event)"></textarea>

      @if (isEditing()) {
      <div class="editor-actions">
        <button type="button" class="primary" (click)="save()">Save Draft</button>
        <button type="button" (click)="cancel()">Cancel</button>
      </div>
      }

      <div class="bottom-actions">
        <button type="button" class="secondary" (click)="save()" [disabled]="!isEditing()">Save Draft</button>
        <button type="button" class="primary" [disabled]="!workingDraft().trim()" (click)="requestApproval.emit()">
          Request Approval
        </button>
      </div>

      @if (statusMessage()) {
      <p class="status">{{ statusMessage() }}</p>
      }
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

      .toolbar,
      .editor-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.6rem;
        margin-bottom: 0.7rem;
      }

      .toolbar button,
      .editor-actions button,
      .bottom-actions button {
        border: 1px solid #cad6e6;
        background: #fff;
        border-radius: 8px;
        padding: 0.45rem 0.75rem;
      }

      textarea {
        width: 100%;
        border: 1px solid #c7d3e4;
        border-radius: 10px;
        min-height: 400px;
        padding: 0.9rem;
        resize: vertical;
        font-family: inherit;
        line-height: 1.45;
      }

      textarea.expanded {
        min-height: 560px;
      }

      .primary {
        background: #1e61d6;
        color: #fff;
        border-color: #1e61d6;
      }

      .secondary {
        background: #fff;
        color: #24476f;
      }

      .bottom-actions {
        margin-top: 0.85rem;
        display: flex;
        justify-content: flex-end;
        gap: 0.6rem;
      }

      .status {
        margin: 0.7rem 0 0;
        color: #155724;
      }
    `
  ]
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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['draftText']) {
      this.workingDraft.set(this.draftText ?? '');
      this.isEditing.set(false);
    }
  }

  startEditing(): void {
    this.statusMessage.set('');
    this.isEditing.set(true);
  }

  updateWorkingDraft(event: Event): void {
    const target = event.target as HTMLTextAreaElement | null;
    this.workingDraft.set(target?.value ?? '');
  }

  save(): void {
    this.saveDraft.emit(this.workingDraft());
    this.isEditing.set(false);
    this.statusMessage.set('Draft saved.');
  }

  cancel(): void {
    this.workingDraft.set(this.draftText ?? '');
    this.isEditing.set(false);
    this.cancelEdit.emit();
    this.statusMessage.set('Draft changes discarded.');
  }

  async copyDraft(): Promise<void> {
    const text = this.workingDraft();
    if (!text) {
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      this.statusMessage.set('Draft copied to clipboard.');
      return;
    }

    this.statusMessage.set('Clipboard is not available in this browser context.');
  }

  toggleExpand(): void {
    this.expanded.set(!this.expanded());
  }

  downloadPdf(): void {
    this.openPrintableWindow();
  }

  printDraft(): void {
    this.openPrintableWindow(true);
  }

  private openPrintableWindow(shouldPrint = false): void {
    const text = this.workingDraft();
    if (!text || typeof window === 'undefined') {
      return;
    }

    const draftWindow = window.open('', '_blank', 'width=900,height=700');
    if (!draftWindow) {
      this.statusMessage.set('Unable to open print window in this browser context.');
      return;
    }

    draftWindow.document.write(
      `<html><head><title>Pre-Authorization Draft</title></head><body><pre style="white-space:pre-wrap;font-family:Arial, sans-serif;line-height:1.5">${text.replace(
        /</g,
        '&lt;'
      )}</pre></body></html>`
    );
    draftWindow.document.close();

    if (shouldPrint) {
      draftWindow.print();
      this.statusMessage.set('Print dialog opened.');
      return;
    }

    this.statusMessage.set('Draft opened for Save as PDF.');
  }
}


