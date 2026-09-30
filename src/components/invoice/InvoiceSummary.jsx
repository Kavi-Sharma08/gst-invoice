import React from 'react';
import { formatCurrency, numberToWords } from '../../utils/currency';

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
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-600 pb-1 border-b border-slate-200">
        <span className="font-semibold text-slate-800">Tax Summary</span>
        <span className="text-[11px] bg-white border border-slate-200 px-2 py-0.5 rounded font-mono text-slate-600">
          {taxType === 'INTRA' ? 'Intra-State (CGST + SGST)' : 'Inter-State (IGST)'}
        </span>
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between text-slate-600">
          <span>Taxable Amount</span>
          <span className="font-mono text-slate-800">{formatCurrency(taxableAmount)}</span>
        </div>

        {taxType === 'INTRA' ? (
          <>
            <div className="flex justify-between text-slate-600">
              <span>Central GST (CGST)</span>
              <span className="font-mono text-slate-800">{formatCurrency(cgst)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>State GST (SGST)</span>
              <span className="font-mono text-slate-800">{formatCurrency(sgst)}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between text-slate-600">
            <span>Integrated GST (IGST)</span>
            <span className="font-mono text-slate-800">{formatCurrency(igst)}</span>
          </div>
        )}

        <div className="flex justify-between text-slate-600 pt-1 border-t border-dashed border-slate-200">
          <span>Total Tax Amount</span>
          <span className="font-mono text-slate-800 font-medium">{formatCurrency(totalTax)}</span>
        </div>

        {Math.abs(roundOff || 0) > 0.001 && (
          <div className="flex justify-between text-slate-500">
            <span>Round Off</span>
            <span className="font-mono">{roundOff > 0 ? `+${formatCurrency(roundOff)}` : formatCurrency(roundOff)}</span>
          </div>
        )}

        <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-300">
          <span>Grand Total</span>
          <span className="font-mono text-slate-900 text-base">{formatCurrency(netTotal ?? grandTotal)}</span>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-200">
        <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Amount in Words</p>
        <p className="text-xs font-semibold text-slate-800 mt-0.5 leading-snug">
          {numberToWords(netTotal ?? grandTotal)}
        </p>
      </div>
    </div>
  );
}
