import React, { useEffect, useRef, useId } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../invoice/InvoiceEditorUI';

/**
 * Accessible in-app confirmation dialog.
 *
 * Props:
 *   isOpen         boolean
 *   title          string
 *   description    string
 *   confirmLabel   string | null (default: 'Confirm'; if null, only cancelLabel is rendered)
 *   cancelLabel    string        (default: 'Cancel')
 *   destructive    boolean       (default: false)
 *   loading        boolean       (default: false)
 *   error          string        (inline error message)
 *   onConfirm      () => void
 *   onCancel       () => void
 */
export function ConfirmDialog({
  isOpen,
  title = 'Are you sure?',
  description = '',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  error = '',
  onConfirm,
  onCancel,
}) {
  const cancelBtnRef = useRef(null);
  const dialogRef = useRef(null);
  const titleId = useId();
  const descId = useId();

  // Autofocus the safe action (cancel button)
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        cancelBtnRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Close on Esc key (capturing phase to take priority)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (loading) return; // prevent closing while in-flight
        e.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, loading, onCancel]);

  // Focus trap inside the dialog
  useEffect(() => {
    if (!isOpen || !dialogRef.current) return;
    const el = dialogRef.current;

    const handleTab = (e) => {
      if (e.key !== 'Tab') return;
      const focusable = el.querySelectorAll('button:not([disabled])');
      if (focusable.length < 2) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleTab);
    return () => window.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        aria-hidden="true"
        onClick={() => {
          if (!loading) onCancel();
        }}
      />

      {/* Dialog container */}
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-surface p-5 shadow-2xl space-y-4"
      >
        <div className="space-y-1.5">
          <h3 id={titleId} className="text-base font-semibold text-text">
            {title}
          </h3>
          {description && (
            <p id={descId} className="text-xs text-muted leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button
            ref={cancelBtnRef}
            type="button"
            variant="secondary"
            size="sm"
            onClick={onCancel}
            disabled={loading}
            className="h-9 px-4 text-xs font-medium"
          >
            {cancelLabel}
          </Button>
          {confirmLabel && (
            <Button
              type="button"
              variant={destructive ? 'danger' : 'primary'}
              size="sm"
              onClick={onConfirm}
              disabled={loading}
              className="h-9 px-4 text-xs font-medium min-w-[80px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                  Deleting…
                </>
              ) : (
                confirmLabel
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;

