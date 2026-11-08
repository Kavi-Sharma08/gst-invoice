import React from 'react';
import { FileText, Plus } from 'lucide-react';
import { formatCurrency } from '@/utils/currency';
import { formatDDMMYYYY } from '../utils/formatters';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
// TODO: temporary dependency, unify Button in components/ui (see CHANGELOG follow-ups)
import { Button } from '@/components/invoice/InvoiceEditorUI';

/**
 * Recent invoices list card with empty state and direct navigation handlers.
 */
export function RecentInvoicesCard({
  invoices = [],
  onViewAll,
  onNewInvoice,
  onInvoiceClick,
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-4 flex flex-col space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-text">Recent invoices</h2>
        <button
          type="button"
          onClick={onViewAll}
          className="text-xs font-medium text-accent hover:underline cursor-pointer"
        >
          View all
        </button>
      </div>

      {invoices.length === 0 ? (
        <div className="py-8 flex flex-col items-center justify-center text-center">
          <FileText className="w-8 h-8 text-faint mb-2" />
          <p className="text-sm font-medium text-text">No invoices yet</p>
          <p className="text-xs text-muted mt-0.5">
            Create your first GST invoice to get started.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={onNewInvoice}
            className="mt-3"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            <span>Create invoice</span>
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="min-w-[500px]">
            {/* Grid Header */}
            <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_100px] gap-3 px-3 py-2 text-[12px] font-medium text-muted uppercase tracking-wider border-b border-border">
              <span>Invoice</span>
              <span>Customer</span>
              <span>Date</span>
              <span className="text-right">Amount</span>
              <span className="text-right">Status</span>
            </div>

            {/* Grid Rows */}
            <div className="divide-y divide-border">
              {invoices.map((inv) => {
                const id = inv._id || inv.id;
                const amount = inv.netTotal || inv.grandTotal || 0;
                return (
                  <div
                    key={id}
                    onClick={() => onInvoiceClick?.(id)}
                    className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_100px] gap-3 px-3 py-3 items-center hover:bg-surface-hover transition-colors cursor-pointer text-xs"
                  >
                    <span className="font-semibold text-text truncate">
                      {inv.invoiceNumber}
                    </span>
                    <span className="text-muted truncate">
                      {inv.customer?.name || 'Customer'}
                    </span>
                    <span className="text-muted tabular-nums truncate">
                      {formatDDMMYYYY(inv.invoiceDate || inv.createdAt)}
                    </span>
                    <span className="font-medium text-text tabular-nums text-right">
                      {formatCurrency(amount)}
                    </span>
                    <span className="text-right">
                      <InvoiceStatusBadge status={inv.status} />
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default RecentInvoicesCard;

