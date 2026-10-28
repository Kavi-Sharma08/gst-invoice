import React from 'react';
import { formatCurrency, numberToWords } from '../../utils/currency';

/**
 * Glide-styled Tax & Total Calculation Summary Card
 */
export function InvoiceSummary({ summary }) {
  if (!summary) return null;

  const {
    taxType,
    taxableAmount,
    cgst,
    sgst,
    igst,
    totalTax,
    grandTotal,
    roundOff,
    netTotal
  } = summary;

  return (
    <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-5 space-y-3.5 shadow-2xs">
      <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200/70">
        <span className="font-bold text-slate-900 font-heading">Tax Summary</span>
        <span className="text-[11px] font-semibold bg-white border border-slate-200 px-2.5 py-0.5 rounded-full text-slate-700 shadow-2xs">
          {taxType === 'INTRA' ? 'Intra-State (CGST + SGST)' : 'Inter-State (IGST)'}
        </span>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex justify-between text-slate-600">
          <span>Taxable Amount</span>
          <span className="font-mono text-slate-900 font-medium tabular-nums">{formatCurrency(taxableAmount)}</span>
        </div>

        {taxType === 'INTRA' ? (
          <>
            <div className="flex justify-between text-slate-600">
              <span>Central GST (CGST)</span>
              <span className="font-mono text-slate-800 tabular-nums">{formatCurrency(cgst)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>State GST (SGST)</span>
              <span className="font-mono text-slate-800 tabular-nums">{formatCurrency(sgst)}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between text-slate-600">
            <span>Integrated GST (IGST)</span>
            <span className="font-mono text-indigo-700 font-medium tabular-nums">{formatCurrency(igst)}</span>
          </div>
        )}

        <div className="flex justify-between text-slate-700 pt-2 border-t border-dashed border-slate-200/90 font-medium">
          <span>Total Tax Liability</span>
          <span className="font-mono text-slate-900 font-bold tabular-nums">{formatCurrency(totalTax)}</span>
        </div>

        {Math.abs(roundOff || 0) > 0.001 && (
          <div className="flex justify-between text-slate-400 text-[11px]">
            <span>Round Off Adjustment</span>
            <span className="font-mono tabular-nums">{roundOff > 0 ? `+${formatCurrency(roundOff)}` : formatCurrency(roundOff)}</span>
          </div>
        )}

        {/* Grand Net Total */}
        <div className="flex justify-between items-baseline pt-3 border-t border-slate-300">
          <span className="text-sm font-bold text-slate-900 font-heading">Net Payable Total</span>
          <span className="font-mono text-xl font-extrabold text-slate-950 tabular-nums font-heading">
            {formatCurrency(netTotal ?? grandTotal)}
          </span>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-200/70">
        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Amount in Words</p>
        <p className="text-xs font-semibold text-slate-800 mt-0.5 leading-relaxed capitalize">
          {numberToWords(netTotal ?? grandTotal)}
        </p>
      </div>
    </div>
  );
}

export default InvoiceSummary;
