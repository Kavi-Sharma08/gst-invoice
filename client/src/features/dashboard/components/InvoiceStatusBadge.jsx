import React from 'react';

/**
 * Status badge for invoices matching the Invoices list styling.
 */
export function InvoiceStatusBadge({ status }) {
  const configs = {
    Paid: {
      dot: 'bg-emerald-400',
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    },
    Issued: {
      dot: 'bg-indigo-400',
      badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    },
    Draft: {
      dot: 'bg-muted',
      badge: 'bg-border text-muted border-border',
    },
    Cancelled: {
      dot: 'bg-danger',
      badge: 'bg-danger/10 text-danger border-danger/20',
    },
  };

  const c = configs[status] || configs.Draft;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border ${c.badge}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} aria-hidden="true" />
      <span>{status || 'Draft'}</span>
    </span>
  );
}

export default InvoiceStatusBadge;

