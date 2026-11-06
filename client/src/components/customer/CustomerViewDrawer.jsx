/**
 * CustomerViewDrawer.jsx
 * Read-only right-side drawer displaying full customer details.
 *
 * Props:
 *   isOpen       boolean
 *   onClose      () => void
 *   onEdit       (field?: string) => void  — opens edit drawer
 *   customer     object
 */

import React, { useEffect, useRef, useId } from 'react';
import { X, Edit3, Plus, AlertTriangle } from 'lucide-react';
import { Button } from '../invoice/InvoiceEditorUI';
import { formatDDMMYYYY } from '../invoice/InvoicesTable';
import { getStateByCode } from '../../gst/taxRules';

// Helper to check if GSTIN state code differs from customer place of supply
function checkStateMismatch(gstin, state) {
  if (!gstin || gstin.length < 2 || !state) return false;
  const code = gstin.slice(0, 2);
  const mapped = getStateByCode(code);
  if (!mapped) return false;
  return mapped.name.trim().toLowerCase() !== state.trim().toLowerCase();
}

export function CustomerViewDrawer({
  isOpen,
  onClose,
  onEdit,
  customer,
}) {
  const drawerRef = useRef(null);
  const closeBtnRef = useRef(null);
  const titleId = useId();

  // Esc key listener & focus management & body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    // Initial focus on close button
    const timer = setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 50);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !customer) return null;

  const isStateMismatch = checkStateMismatch(customer.gstin, customer.state);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity duration-300"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed inset-y-0 right-0 z-50 flex flex-col w-full max-w-[420px] bg-surface shadow-2xl transition-transform duration-300 ease-in-out translate-x-0"
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 id={titleId} className="text-[15px] font-semibold text-text">
            Customer details
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-text hover:bg-border transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Scrollable Body ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 text-xs">
          {/* Customer Name */}
          <div>
            <span className="text-muted block text-[11px] uppercase tracking-wider mb-1">
              Customer name
            </span>
            <span className="font-semibold text-text text-sm">
              {customer.name}
            </span>
          </div>

          {/* GSTIN (shown only if filled) */}
          {customer.gstin && (
            <div>
              <span className="text-muted block text-[11px] uppercase tracking-wider mb-1">
                GSTIN
              </span>
              <span className="font-medium text-text font-sans tabular-nums text-sm">
                {customer.gstin}
              </span>
            </div>
          )}

          {/* Place of supply (with mismatch warning) */}
          {customer.state ? (
            <div>
              <span className="text-muted block text-[11px] uppercase tracking-wider mb-1">
                Place of supply
              </span>
              <div className="flex items-center gap-1.5 text-sm font-medium text-text">
                <span>{customer.state}</span>
                {isStateMismatch && (
                  <span
                    title="State differs from GSTIN state code"
                    className="inline-flex items-center text-warning cursor-help"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                    <span className="sr-only">State differs from GSTIN state code</span>
                  </span>
                )}
              </div>
            </div>
          ) : null}

          {/* Email */}
          <div>
            <span className="text-muted block text-[11px] uppercase tracking-wider mb-1">
              Email
            </span>
            {customer.email ? (
              <span className="text-text font-medium break-all text-sm">
                {customer.email}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onEdit?.('email')}
                className="inline-flex items-center gap-1 text-xs text-muted hover:text-accent transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>+ Add email</span>
              </button>
            )}
          </div>

          {/* Phone */}
          <div>
            <span className="text-muted block text-[11px] uppercase tracking-wider mb-1">
              Phone
            </span>
            {customer.phone ? (
              <span className="text-text font-medium text-sm tabular-nums">
                +91 {customer.phone}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onEdit?.('phone')}
                className="inline-flex items-center gap-1 text-xs text-muted hover:text-accent transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>+ Add phone</span>
              </button>
            )}
          </div>

          {/* Billing address */}
          <div>
            <span className="text-muted block text-[11px] uppercase tracking-wider mb-1">
              Billing address
            </span>
            {customer.address ? (
              <span className="text-text leading-relaxed whitespace-pre-line text-sm font-normal">
                {customer.address}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onEdit?.('address')}
                className="inline-flex items-center gap-1 text-xs text-muted hover:text-accent transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>+ Add address</span>
              </button>
            )}
          </div>

          {/* Added date (small muted text at bottom) */}
          {customer.createdAt && (
            <div className="pt-4 border-t border-border/60">
              <span className="text-[11px] text-muted">
                Added on {formatDDMMYYYY(customer.createdAt)}
              </span>
            </div>
          )}
        </div>

        {/* ── Sticky Footer ───────────────────────────────────────────────── */}
        <div className="shrink-0 flex items-center justify-end gap-3 px-5 py-4 border-t border-border bg-surface">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
          >
            Close
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => onEdit?.()}
            className="inline-flex items-center gap-1.5"
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit customer</span>
          </Button>
        </div>
      </div>
    </>
  );
}

export default CustomerViewDrawer;

