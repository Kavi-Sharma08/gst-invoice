import React from 'react';

/**
 * Glide-inspired Status and Tag Badge
 */
export function Badge({ children, variant = 'default', size = 'sm', className = '', withDot = false }) {
  const variants = {
    default: 'bg-[var(--surface-hover)] text-[var(--foreground)] border-[var(--border)]',
    success: 'bg-emerald-500/15 text-[var(--success)] border-emerald-500/30',
    warning: 'bg-amber-500/15 text-[var(--warning)] border-amber-500/30',
    info: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    accent: 'bg-[var(--accent-soft-bg)] text-[var(--accent-soft-text)] border-[var(--accent)]/30',
    purple: 'bg-[var(--accent-soft-bg)] text-[var(--accent-soft-text)] border-[var(--accent)]/30',
    neutral: 'bg-[var(--surface-hover)] text-[var(--muted)] border-[var(--border)]',
    danger: 'bg-rose-500/15 text-[var(--danger)] border-rose-500/30'
  };

  const dots = {
    default: 'bg-[var(--muted)]',
    success: 'bg-[var(--success)] animate-pulse',
    warning: 'bg-[var(--warning)]',
    info: 'bg-sky-400',
    accent: 'bg-[var(--accent)]',
    purple: 'bg-[var(--accent)]',
    neutral: 'bg-[var(--muted)]',
    danger: 'bg-[var(--danger)]'
  };

  const sizes = {
    xs: 'text-[10px] px-2 py-0.5 font-medium gap-1',
    sm: 'text-[11px] px-2.5 py-0.5 font-medium gap-1.5',
    md: 'text-xs px-3 py-1 font-semibold gap-1.5'
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border ${variants[variant] || variants.default} ${
        sizes[size] || sizes.sm
      } ${className}`}
    >
      {withDot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dots[variant] || dots.default}`} aria-hidden="true" />
      )}
      <span>{children}</span>
    </span>
  );
}

export function InvoiceStatusBadge({ status, size = 'sm' }) {
  switch (status) {
    case 'Paid':
      return <Badge variant="success" size={size} withDot>Paid</Badge>;
    case 'Issued':
      return <Badge variant="warning" size={size} withDot>Issued</Badge>;
    case 'Pending':
      return <Badge variant="warning" size={size} withDot>Pending</Badge>;
    case 'Draft':
      return <Badge variant="neutral" size={size} withDot>Draft</Badge>;
    case 'Cancelled':
      return <Badge variant="danger" size={size} withDot>Cancelled</Badge>;
    default:
      return <Badge variant="default" size={size} withDot>{status || 'Draft'}</Badge>;
  }
}

export default Badge;
