import React from 'react';
import { CalendarClock } from 'lucide-react';
import { formatCurrency } from '@/utils/currency';
import { getDueStatus } from '../utils/dueStatus';

/**
 * Needs Attention card: lists overdue and upcoming due invoices plus GSTR-1 calendar reminder.
 */
export function NeedsAttentionCard({
  invoices = [],
  gstr1Reminder,
  onInvoiceClick,
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-4 flex flex-col space-y-3">
      <div>
        <h2 className="text-[14px] font-semibold text-text">Needs attention</h2>
        <p className="text-[12px] text-muted">Overdue and upcoming due payments</p>
      </div>

      {invoices.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted">
          Nothing needs attention.
        </div>
      ) : (
        <div className="divide-y divide-border">
          {invoices.map((inv) => {
            const id = inv._id || inv.id;
            const custName = inv.customer?.name || 'Customer';
            const amount = inv.netTotal || inv.grandTotal || 0;
            const dueInfo = getDueStatus(inv.dueDate);

            return (
              <div
                key={id}
                onClick={() => onInvoiceClick?.(id)}
                className="py-2.5 flex items-center justify-between gap-3 hover:bg-surface-hover transition-colors cursor-pointer -mx-1 px-1 rounded-md"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-text truncate">{custName}</p>
                  <p className="text-[11px] text-muted truncate">
                    {inv.invoiceNumber} ·{' '}
                    <span className={dueInfo.className}>{dueInfo.label}</span>
                  </p>
                </div>
                <span className="text-xs font-medium text-text tabular-nums shrink-0">
                  {formatCurrency(amount)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* GSTR-1 Reminder in plain bordered row */}
      {gstr1Reminder && (
        <div className="flex items-center gap-2.5 p-3 rounded-lg border border-border bg-surface text-xs text-muted mt-auto">
          <CalendarClock className="w-4 h-4 text-muted shrink-0" />
          <span className="truncate">{gstr1Reminder}</span>
        </div>
      )}
    </section>
  );
}

export default NeedsAttentionCard;

