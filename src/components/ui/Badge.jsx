import React from 'react';

export function Badge({ children, variant = 'default', size = 'sm', className = '' }) {
  const variants = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    neutral: 'bg-slate-100 text-slate-600 border-slate-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200'
  };

  const sizes = {
    xs: 'text-[10px] px-1.5 py-0.5 font-medium',
    sm: 'text-xs px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-semibold'
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border ${variants[variant] || variants.default} ${
        sizes[size] || sizes.sm
      } ${className}`}
    >
      {children}
    </span>
  );
}

export function InvoiceStatusBadge({ status }) {
  switch (status) {
    case 'Paid':
      return <Badge variant="success">Paid</Badge>;
    case 'Issued':
      return <Badge variant="info">Issued</Badge>;
    case 'Draft':
      return <Badge variant="neutral">Draft</Badge>;
    case 'Cancelled':
      return <Badge variant="danger">Cancelled</Badge>;
    default:
      return <Badge variant="default">{status || 'Draft'}</Badge>;
  }
}
