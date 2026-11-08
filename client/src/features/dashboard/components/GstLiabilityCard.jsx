import React from 'react';
import { formatCurrency } from '@/utils/currency';

/**
 * GST liability summary card showing taxable turnover and tax breakdowns.
 */
export function GstLiabilityCard({
  period,
  hasIssuedInvoices,
  taxableTurnover,
  cgstTotal,
  sgstTotal,
  igstTotal,
  gstTotal,
  allTaxZero,
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-4 flex flex-col space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[14px] font-semibold text-text">GST liability</h2>
          <p className="text-[12px] text-muted">{period}</p>
        </div>
        {hasIssuedInvoices && (
          <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md border border-border bg-surface text-muted">
            GSTR-1 ready
          </span>
        )}
      </div>

      <div className="space-y-2 pt-1 text-xs">
        {/* Taxable turnover */}
        <div className="flex items-center justify-between py-1">
          <span className="text-muted">Taxable turnover</span>
          <span className="font-medium text-text tabular-nums">
            {formatCurrency(taxableTurnover)}
          </span>
        </div>

        {/* Show CGST, SGST, IGST unless all are zero */}
        {!allTaxZero && (
          <>
            <div className="flex items-center justify-between py-1">
              <span className="text-muted">CGST (central)</span>
              <span className="font-medium text-text tabular-nums">
                {formatCurrency(cgstTotal)}
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-muted">SGST (state)</span>
              <span className="font-medium text-text tabular-nums">
                {formatCurrency(sgstTotal)}
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-muted">IGST (inter-state)</span>
              <span className="font-medium text-text tabular-nums">
                {formatCurrency(igstTotal)}
              </span>
            </div>
          </>
        )}

        {/* Total GST payable */}
        <div className="flex items-center justify-between border-t border-border pt-2.5 font-semibold text-text">
          <span>Total GST payable</span>
          <span className="tabular-nums">{formatCurrency(gstTotal)}</span>
        </div>
      </div>
    </section>
  );
}

export default GstLiabilityCard;

