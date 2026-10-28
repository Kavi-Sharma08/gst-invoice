import React from 'react';

/**
 * Glide-inspired Status and Tag Badge
 */
export function Badge({ children, variant = 'default', size = 'sm', className = '', withDot = false }) {
  const variants = {
    default: 'bg-slate-100/90 text-slate-700 border-slate-200/80',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    warning: 'bg-amber-50 text-amber-800 border-amber-200/80',
    info: 'bg-sky-50 text-sky-700 border-sky-200/80',
    purple: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    neutral: 'bg-slate-100 text-slate-600 border-slate-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200/80'
  };

  const dots = {
    default: 'bg-slate-400',
    success: 'bg-emerald-500 animate-pulse',
    warning: 'bg-amber-500',
    info: 'bg-sky-500',
    purple: 'bg-indigo-500',
    neutral: 'bg-slate-400',
    danger: 'bg-rose-500'
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
