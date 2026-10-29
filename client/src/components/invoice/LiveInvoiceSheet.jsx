import React from 'react';
import { formatCurrency, numberToWords } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { ShieldCheck, Building2, CheckCircle2 } from 'lucide-react';

/**
 * Photorealistic Live GST Invoice Sheet
 * Renders in real-time alongside or inside the invoice editor.
 */
export function LiveInvoiceSheet({
  business = {},
  customer = {},
  invoiceNumber = '',
  invoiceDate = '',
  dueDate = '',
  status = 'Draft',
  placeOfSupply = '',
  taxType = 'INTRA',
  items = [],
  calculation = {},
  notes = '',
  terms = '',
  bankDetails = {}
}) {
  const biz = business || {};
  const cust = customer || {};
  const isInterState = taxType === 'INTER';

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm p-6 sm:p-8 font-sans text-xs text-slate-800 space-y-6 relative overflow-hidden">
      {/* Top Banner Ribbon */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
            ₹
          </div>
          <div>
            <h2 className="font-bold text-sm text-slate-900 uppercase tracking-wider font-heading">
              Tax Invoice
            </h2>
            <p className="text-[10px] text-slate-400">Original for Recipient · Rule 46 of CGST Rules</p>
          </div>
        </div>

        <div className="text-right">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}>
            {status || 'Draft'}
          </span>
          <div className="text-xs font-mono font-bold text-slate-900 mt-1">
            {invoiceNumber || 'INV-DRAFT'}
          </div>
        </div>
      </div>

      {/* Business & Customer Two-Column Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-[11px] pt-1">
        {/* Billed By (Supplier) */}
        <div className="space-y-1 p-3.5 rounded-xl bg-slate-50/70 border border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Billed By (Supplier)
          </span>
          <div className="font-bold text-slate-900 text-xs">
            {biz.businessName || 'Your Business Name'}
          </div>
          {biz.gstin ? (
            <div className="font-mono text-slate-700">
              <span className="text-slate-400">GSTIN: </span>{biz.gstin}
            </div>
          ) : (
            <div className="text-amber-600 text-[10px]">Add GSTIN in Settings</div>
          )}
          {biz.address && <div className="text-slate-500 line-clamp-2">{biz.address}</div>}
          {biz.state && (
            <div className="text-slate-600">
              <span className="text-slate-400">State: </span>{biz.state}
            </div>
          )}
          {biz.email && <div className="text-slate-500">{biz.email}</div>}
        </div>

        {/* Billed To (Customer) */}
        <div className="space-y-1 p-3.5 rounded-xl bg-slate-50/70 border border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Billed To (Customer)
          </span>
          <div className="font-bold text-slate-900 text-xs">
            {cust.name || 'Customer / Client Name'}
          </div>
          {cust.gstin ? (
            <div className="font-mono text-slate-700">
              <span className="text-slate-400">GSTIN: </span>{cust.gstin}
            </div>
          ) : (
            <div className="text-slate-400 text-[10px]">Unregistered / Consumer (B2C)</div>
          )}
          {cust.address && <div className="text-slate-500 line-clamp-2">{cust.address}</div>}
          <div className="text-slate-600">
            <span className="text-slate-400">Place of Supply: </span>
            <span className="font-semibold text-slate-800">{placeOfSupply || cust.state || 'Not Selected'}</span>
          </div>
          {cust.email && <div className="text-slate-500">{cust.email}</div>}
        </div>
      </div>

      {/* Invoice Dates Meta Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-[11px]">
        <div>
          <span className="text-slate-400 block text-[10px]">Invoice Date:</span>
          <span className="font-semibold text-slate-800">{invoiceDate ? formatDate(invoiceDate) : 'Today'}</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px]">Due Date:</span>
          <span className="font-semibold text-slate-800">{dueDate ? formatDate(dueDate) : 'Immediate'}</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px]">Tax Type:</span>
          <span className="font-semibold text-[var(--accent-text)]">
            {isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'}
          </span>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
        <table className="w-full text-left text-[11px] border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase">
              <th className="py-2.5 px-3 w-8">#</th>
              <th className="py-2.5 px-3">Item & Description</th>
              <th className="py-2.5 px-2 w-16">HSN</th>
              <th className="py-2.5 px-2 text-right w-12">Qty</th>
              <th className="py-2.5 px-2 text-right w-16">Rate</th>
              <th className="py-2.5 px-2 text-right w-12">GST</th>
              <th className="py-2.5 px-3 text-right w-20">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 || !items[0]?.description ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-slate-400 text-xs">
                  Items added in the editor will appear live here
                </td>
              </tr>
            ) : (
              items.map((it, idx) => {
                const qty = Number(it.quantity) || 1;
                const rate = Number(it.rate) || 0;
                const taxable = qty * rate;
                return (
                  <tr key={idx} className="align-top">
                    <td className="py-2.5 px-3 text-slate-400 text-center">{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-900 whitespace-pre-line">
                        {it.description || 'Untitled Item'}
                      </div>
                    </td>
                    <td className="py-2.5 px-2 font-mono text-slate-500">{it.hsnSac || '—'}</td>
                    <td className="py-2.5 px-2 text-right font-medium text-slate-700 tabular-nums">{qty}</td>
                    <td className="py-2.5 px-2 text-right font-mono text-slate-700 tabular-nums">{formatCurrency(rate)}</td>
                    <td className="py-2.5 px-2 text-right font-semibold text-slate-700">{it.gstRate || 0}%</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {formatCurrency(taxable)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Tax Breakdown & Grand Total Live Box */}
      <div className="flex flex-col sm:flex-row justify-between gap-6 pt-2">
        {/* Bank & Notes */}
        <div className="sm:max-w-xs space-y-3 text-[11px] text-slate-500">
          {bankDetails.accountNumber && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-[10px] space-y-0.5">
              <span className="font-bold text-slate-700 uppercase tracking-wider block">Bank Details</span>
              <div><span className="text-slate-400">Bank: </span>{bankDetails.bankName}</div>
              <div><span className="text-slate-400">A/C: </span><span className="font-mono">{bankDetails.accountNumber}</span></div>
              <div><span className="text-slate-400">IFSC: </span><span className="font-mono">{bankDetails.ifscCode}</span></div>
              {bankDetails.upiId && <div><span className="text-slate-400">UPI: </span>{bankDetails.upiId}</div>}
            </div>
          )}
          {notes && (
            <div>
              <span className="font-bold text-slate-700 text-[10px] uppercase">Notes:</span>
              <p className="text-slate-500 mt-0.5 whitespace-pre-line">{notes}</p>
            </div>
          )}
        </div>

        {/* Calculation Totals */}
        <div className="w-full sm:max-w-xs space-y-1.5 text-xs text-slate-600 bg-slate-50/90 p-4 rounded-xl border border-slate-200/80">
          <div className="flex justify-between">
            <span>Taxable Turnover</span>
            <span className="font-mono text-slate-800 font-medium tabular-nums">
              {formatCurrency(calculation.taxableAmount || 0)}
            </span>
          </div>

          {!isInterState ? (
            <>
              <div className="flex justify-between">
                <span>CGST</span>
                <span className="font-mono text-slate-800 tabular-nums">
                  {formatCurrency(calculation.cgst || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>SGST</span>
                <span className="font-mono text-slate-800 tabular-nums">
                  {formatCurrency(calculation.sgst || 0)}
                </span>
              </div>
            </>
          ) : (
            <div className="flex justify-between">
              <span>IGST</span>
              <span className="font-mono text-[var(--accent-text)] font-medium tabular-nums">
                {formatCurrency(calculation.igst || 0)}
              </span>
            </div>
          )}

          <div className="flex justify-between pt-1 border-t border-slate-200 font-medium">
            <span>Total GST Tax</span>
            <span className="font-mono text-slate-900 tabular-nums">
              {formatCurrency(calculation.totalTax || 0)}
            </span>
          </div>

          <div className="flex justify-between items-baseline pt-2 border-t border-slate-300">
            <span className="font-bold text-slate-950 font-heading">Total Amount</span>
            <span className="font-mono text-lg font-extrabold text-slate-950 tabular-nums">
              {formatCurrency(calculation.netTotal || calculation.grandTotal || 0)}
            </span>
          </div>

          <div className="pt-2 text-[10px] text-slate-400 border-t border-slate-200 capitalize">
            {numberToWords(calculation.netTotal || calculation.grandTotal || 0)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LiveInvoiceSheet;
