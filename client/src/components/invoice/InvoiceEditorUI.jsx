/**
 * InvoiceEditorUI.jsx
 * Shared design-system primitives for the GST invoice editor.
 *
 * Rules:
 *  - Colors: only semantic names (bg, surface, border, text, muted, faint, accent, danger)
 *  - Scale: inputs h-10, rounded-lg, text-sm, gap-4
 *  - Weights: 400 (normal), 500 (medium), 600 (semibold) only
 *  - Font: Inter everywhere (no monospace)
 */

import React from 'react';

// ── SectionHeading (15px / 600) ───────────────────────────────────────────────
export function SectionHeading({ children, action }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-[15px] font-semibold text-text tracking-tight">{children}</h2>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ── Field ────────────────────────────────────────────────────────────────────
// Label (13px / 500 / muted) + input + optional helper (12px faint) or error (12px danger)
export function Field({ label, htmlFor, optional, helper, error, children, className = '' }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-muted leading-none">
          {label}
          {optional && <span className="ml-1.5 text-xs font-normal text-faint">(optional)</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-danger leading-none">{error}</p>
      ) : helper ? (
        <p className="text-xs text-faint leading-none">{helper}</p>
      ) : null}
    </div>
  );
}

// ── Input (h-10, rounded-lg, text-sm 14px / 400) ──────────────────────────────
export const Input = React.forwardRef(function Input(
  { className = '', error, ...props },
  ref
) {
  const hasPx = className.includes('px-');
  return (
    <input
      ref={ref}
      className={[
        'h-10 w-full rounded-lg border',
        hasPx ? '' : 'px-3',
        'text-sm font-normal text-text',
        'bg-surface placeholder:text-faint',
        'focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        error ? 'border-danger' : 'border-border',
        className,
      ].filter(Boolean).join(' ')}
      {...props}
    />
  );
});

// ── Textarea (rounded-lg, text-sm 14px / 400) ─────────────────────────────────
export const Textarea = React.forwardRef(function Textarea(
  { className = '', error, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      className={[
        'w-full rounded-lg border px-3 py-2',
        'text-sm font-normal text-text leading-snug',
        'bg-surface placeholder:text-faint',
        'focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent',
        'resize-y',
        error ? 'border-danger' : 'border-border',
        className,
      ].join(' ')}
      {...props}
    />
  );
});

// ── Select (h-10, rounded-lg, text-sm 14px / 400) ─────────────────────────────
export const Select = React.forwardRef(function Select(
  { className = '', error, children, ...props },
  ref
) {
  const hasText = className.includes('text-');
  return (
    <select
      ref={ref}
      className={[
        'h-10 w-full rounded-lg border px-3',
        'text-sm font-normal',
        hasText ? '' : 'text-text',
        'bg-surface',
        'focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent',
        'disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer',
        error ? 'border-danger' : 'border-border',
        className,
      ].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </select>
  );
});

// ── Button ───────────────────────────────────────────────────────────────────
export function Button({
  variant = 'primary',
  size = 'md',
  disabled,
  className = '',
  children,
  ...props
}) {
  const base =
    'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-bg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer';

  const sizes = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 text-sm',
    lg: 'h-11 px-5 text-sm',
  };

  const variants = {
    primary:   'bg-accent text-text hover:opacity-90',
    secondary: 'border border-border bg-surface text-text hover:bg-border',
    ghost:     'text-muted hover:text-text hover:bg-surface',
    danger:    'text-danger hover:bg-danger/10',
  };

  return (
    <button
      disabled={disabled}
      className={[base, sizes[size] ?? sizes.md, variants[variant] ?? variants.primary, className].join(' ')}
      {...props}
    >
      {children}
    </button>
  );
}

// ── Divider (1px divider) ─────────────────────────────────────────────────────
export function Divider() {
  return <div className="border-t border-border" />;
}
