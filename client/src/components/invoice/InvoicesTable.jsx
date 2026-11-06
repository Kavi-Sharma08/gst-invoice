import React from 'react';
import { formatCurrency } from '../../utils/currency';
import { Eye, Edit3, Download, Copy, XCircle, FileText } from 'lucide-react';
import { DropdownMenu } from '../ui/DropdownMenu';

// ── Format Date as DD/MM/YYYY ─────────────────────────────────────────────────
export function formatDDMMYYYY(dateInput) {
  if (!dateInput) return '—';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) {
      const parts = String(dateInput).split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return String(dateInput);
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(dateInput);
  }
}

// ── Status Badge (preserved for external/shared usage) ────────────────────────
export function StatusBadge({ status }) {
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

// ── Unified Grid Template for Desktop Invoices Table ──────────────────────────
export const INVOICES_GRID_CLASS =
  'grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_48px] gap-4 px-4 items-center';

// ── InvoicesTable Component ───────────────────────────────────────────────────
export function InvoicesTable({
  invoices = [],
  loading = false,
  onNavigate,
  onDownloadPDF,
  onDuplicate,
  onCancel,
  emptyState,
}) {
  if (loading) {
    return (
      <div className="divide-y divide-border">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`${INVOICES_GRID_CLASS} h-14 animate-pulse`}>
            <div className="h-3.5 bg-border rounded w-28" />
            <div className="h-3.5 bg-border rounded w-20" />
            <div className="h-3.5 bg-border rounded w-20" />
            <div className="h-3.5 bg-border rounded w-24 ml-auto" />
            <div className="h-7 w-7 bg-border rounded ml-auto" />
          </div>
        ))}
      </div>
    );
  }

  if (invoices.length === 0) {
    if (emptyState) return emptyState;

    return (
      <div className="min-h-[200px] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 rounded-lg bg-surface border border-border flex items-center justify-center text-muted mb-3">
          <FileText className="w-5 h-5" />
        </div>
        <h3 className="text-base font-semibold text-text">No invoices found</h3>
        <p className="text-xs text-muted mt-1 max-w-sm">
          No invoice records match this view.
        </p>
      </div>
    );
  }

  const getMenuItems = (inv) => {
    const targetId = inv._id || inv.id;
    const isDraft = inv.status === 'Draft';
    const isCancelled = inv.status === 'Cancelled';

    const items = [
      {
        label: 'View',
        icon: Eye,
        onSelect: () => onNavigate?.('invoice-details', targetId),
      },
    ];

    if (isDraft) {
      items.push({
        label: 'Edit',
        icon: Edit3,
        onSelect: () => onNavigate?.('edit-invoice', targetId),
      });
    }

    if (onDownloadPDF) {
      items.push({
        label: 'Download PDF',
        icon: Download,
        onSelect: () => onDownloadPDF(inv),
      });
    }

    if (onDuplicate) {
      items.push({
        label: 'Duplicate',
        icon: Copy,
        onSelect: () => onDuplicate(inv),
      });
    }

    if (onCancel && !isCancelled) {
      items.push({
        label: 'Cancel',
        icon: XCircle,
        danger: true,
        dividerBefore: true,
        onSelect: () => onCancel(inv),
      });
    }

    return items;
  };

  return (
    <>
      {/* Desktop Grid Table View (≥ md) */}
      <div className="hidden md:block">
        {/* Header Row */}
        <div
          className={`${INVOICES_GRID_CLASS} py-3 border-b border-border text-[12px] font-medium text-muted uppercase tracking-wider`}
        >
          <div>Invoice no.</div>
          <div>Date</div>
          <div>Due date</div>
          <div className="text-right">Amount</div>
          <div className="flex justify-end">
            <span className="sr-only">Actions</span>
          </div>
        </div>

        {/* Data Rows */}
        <div className="divide-y divide-border">
          {invoices.map((inv) => {
            const targetId = inv._id || inv.id;
            const net = Number(inv.netTotal ?? inv.grandTotal) || 0;

            return (
              <div
                key={targetId}
                role="button"
                tabIndex={0}
                onClick={() => onNavigate?.('invoice-details', targetId)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onNavigate?.('invoice-details', targetId);
                }}
                className={`${INVOICES_GRID_CLASS} h-14 hover:bg-surface/50 transition-colors cursor-pointer text-xs focus:outline-none focus:bg-surface/50`}
              >
                {/* Invoice no. */}
                <div className="font-medium text-text truncate">
                  {inv.invoiceNumber || 'INV-DRAFT'}
                </div>

                {/* Date */}
                <div className="text-muted truncate">
                  {formatDDMMYYYY(inv.invoiceDate)}
                </div>

                {/* Due date */}
                <div className="text-muted truncate">
                  {inv.dueDate ? formatDDMMYYYY(inv.dueDate) : 'Immediate'}
                </div>

                {/* Amount (right-aligned, tabular-nums) */}
                <div className="font-medium text-text tabular-nums text-right">
                  {formatCurrency(net)}
                </div>

                {/* Actions Kebab Menu */}
                <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu
                    ariaLabel={`Actions for invoice ${inv.invoiceNumber || 'draft'}`}
                    items={getMenuItems(inv)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Stacked Card View (< md) */}
      <div className="md:hidden divide-y divide-border">
        {invoices.map((inv) => {
          const targetId = inv._id || inv.id;
          const net = Number(inv.netTotal ?? inv.grandTotal) || 0;

          return (
            <div
              key={targetId}
              role="button"
              tabIndex={0}
              onClick={() => onNavigate?.('invoice-details', targetId)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onNavigate?.('invoice-details', targetId);
              }}
              className="p-4 space-y-2 hover:bg-surface/50 transition-colors cursor-pointer focus:outline-none focus:bg-surface/50"
            >
              {/* Top: Invoice No. + Amount + Actions */}
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-text text-sm truncate">
                  {inv.invoiceNumber || 'INV-DRAFT'}
                </span>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-semibold text-text tabular-nums text-right">
                    {formatCurrency(net)}
                  </span>
                  <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu
                      ariaLabel={`Actions for invoice ${inv.invoiceNumber || 'draft'}`}
                      items={getMenuItems(inv)}
                    />
                  </div>
                </div>
              </div>

              {/* Bottom: Dates */}
              <div className="flex items-center justify-between text-xs text-muted">
                <span>{formatDDMMYYYY(inv.invoiceDate)}</span>
                <span>{inv.dueDate ? `Due ${formatDDMMYYYY(inv.dueDate)}` : 'Due Immediate'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default InvoicesTable;
