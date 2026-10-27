import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Printer, Edit3, Copy, Trash2, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { InvoiceStatusBadge } from '../components/ui/Badge';
import { getInvoiceById, updateInvoice, deleteInvoice, duplicateInvoice, getInvoices } from '../db/invoices';
import { getSettings } from '../db/settings';
import { generateNextInvoiceNumber } from '../utils/invoiceNumber';
import { generateInvoicePDF } from '../pdf/generateInvoicePDF';
import { formatCurrency, numberToWords } from '../utils/currency';
import { formatDate } from '../utils/date';
import { getStateByName, getStateByCode } from '../gst/taxRules';

export function InvoiceDetails({ invoiceId, onNavigate }) {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvoice();
  }, [invoiceId]);

  const loadInvoice = async () => {
    try {
      setLoading(true);
      const data = await getInvoiceById(invoiceId);
      setInvoice(data);
    } catch (err) {
      console.error('Failed to load invoice:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!invoice) return;
    generateInvoicePDF(invoice, { action: 'download' });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleStatusToggle = async () => {
    if (!invoice) return;
    const newStatus = invoice.status === 'Paid' ? 'Issued' : 'Paid';
    try {
      await updateInvoice(invoice.id, { status: newStatus });
      setInvoice({ ...invoice, status: newStatus });
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleDuplicate = async () => {
    try {
      const settings = await getSettings();
      const allInvoices = await getInvoices();
      const newNum = generateNextInvoiceNumber(
        settings.invoicePrefix,
        settings.startingNumber,
        allInvoices
      );
      const dup = await duplicateInvoice(invoice.id, newNum);
      onNavigate('edit-invoice', dup.id);
    } catch (err) {
      alert(err.message || 'Failed to duplicate invoice');
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete invoice ${invoice.invoiceNumber}?`)) {
      try {
        await deleteInvoice(invoice.id);
        onNavigate('invoices');
      } catch (err) {
        alert(err.message || 'Failed to delete invoice');
      }
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-500">Loading invoice...</div>;
  }

  if (!invoice) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        Invoice not found.{' '}
        <button onClick={() => onNavigate('dashboard')} className="underline text-slate-800">
          Go back to dashboard
        </button>
      </div>
    );
  }

  const business = invoice.business || {};
  const customer = invoice.customer || {};
  const items = invoice.items || [];
  const taxType = invoice.taxType || 'INTRA';
  const posState = invoice.placeOfSupply || customer.state || business.state;
  const posObj = getStateByName(posState) || getStateByCode(posState);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Bar Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-slate-200 no-print">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('invoices')}
            className="text-xs text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            All Invoices
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 font-mono">
              {invoice.invoiceNumber}
            </h1>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleStatusToggle}
            className="text-xs"
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-slate-600" />
            {invoice.status === 'Paid' ? 'Mark as Unpaid' : 'Mark as Paid'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('edit-invoice', invoice.id)}
            className="text-xs"
          >
            <Edit3 className="w-3.5 h-3.5 mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDuplicate}
            className="text-xs"
          >
            <Copy className="w-3.5 h-3.5 mr-1" />
            Duplicate
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="text-xs"
          >
            <Printer className="w-3.5 h-3.5 mr-1" />
            Print
          </Button>
          <Button
            size="sm"
            onClick={handleDownloadPDF}
            className="text-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            Download PDF
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="text-xs text-rose-600 hover:bg-rose-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Embedded Invoice Sheet */}
      <div className="bg-white p-6 sm:p-10 shadow-xs border border-slate-200 rounded-lg text-slate-900 text-xs print-page">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-300 pb-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">Tax Invoice</h1>
            <p className="text-[11px] text-slate-500 mt-0.5">Issued under Section 31 of CGST Act, 2017</p>
          </div>
          <div className="text-right">
            <span className="inline-block text-[11px] font-semibold text-slate-600 border border-slate-300 px-2.5 py-0.5 rounded bg-slate-50">
              Original for Recipient
            </span>
          </div>
        </div>

        {/* Seller & Invoice Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {business.businessName || 'Business Name'}
            </h2>
            {business.gstin && (
              <p className="mt-1 font-mono text-[11px] text-slate-800">
                <span className="font-bold">GSTIN:</span> {business.gstin}
              </p>
            )}
            {business.pan && (
              <p className="font-mono text-[11px] text-slate-700">
                <span className="font-bold">PAN:</span> {business.pan}
              </p>
            )}
            {business.address && (
              <p className="text-slate-600 mt-1 whitespace-pre-line leading-relaxed">
                {business.address}
              </p>
            )}
            {business.state && (
              <p className="text-slate-600">
                <span className="font-medium">State:</span> {business.state}
              </p>
            )}
            {(business.phone || business.email) && (
              <p className="text-slate-500 text-[11px] mt-1">
                {[business.phone, business.email].filter(Boolean).join(' • ')}
              </p>
            )}
          </div>

          <div className="bg-slate-50 p-3.5 rounded border border-slate-200 text-xs space-y-1.5 self-start">
            <div className="flex justify-between">
              <span className="text-slate-500">Invoice No:</span>
              <span className="font-bold font-mono text-slate-900">{invoice.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Invoice Date:</span>
              <span className="font-medium text-slate-800">{formatDate(invoice.invoiceDate)}</span>
            </div>
            {invoice.dueDate && (
              <div className="flex justify-between">
                <span className="text-slate-500">Due Date:</span>
                <span className="font-medium text-slate-800">{formatDate(invoice.dueDate)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Place of Supply:</span>
              <span className="font-medium text-slate-800">
                {posState || '—'}{posObj?.code ? ` (${posObj.code})` : ''}
              </span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-200">
              <span className="text-slate-500">Tax Type:</span>
              <span className="font-semibold text-slate-800">
                {taxType === 'INTRA' ? 'Intra-State (CGST + SGST)' : 'Inter-State (IGST)'}
              </span>
            </div>
          </div>
        </div>

        {/* Bill To */}
        <div className="py-3 border-b border-slate-200">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Bill To / Recipient
          </p>
          <h3 className="text-sm font-bold text-slate-900">
            {customer.name || 'Walk-in / Cash Customer'}
          </h3>
          {customer.gstin ? (
            <p className="font-mono text-[11px] text-slate-800 mt-0.5">
              <span className="font-bold">GSTIN:</span> {customer.gstin}
            </p>
          ) : (
            <p className="text-[11px] text-slate-500 mt-0.5">Tax Status: Unregistered Consumer (B2C)</p>
          )}
          {customer.address && (
            <p className="text-slate-600 mt-1 whitespace-pre-line leading-relaxed">
              {customer.address}
            </p>
          )}
          {customer.state && (
            <p className="text-slate-600">
              <span className="font-medium">State:</span> {customer.state}
            </p>
          )}
          {(customer.phone || customer.email) && (
            <p className="text-slate-500 text-[11px] mt-0.5">
              {[customer.phone, customer.email].filter(Boolean).join(' • ')}
            </p>
          )}
        </div>

        {/* Line Items Table */}
        <div className="py-4 overflow-x-auto">
          <table className="w-full border-collapse border border-slate-200 text-left text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                <th className="py-2 px-2 border border-slate-200 w-8 text-center">#</th>
                <th className="py-2 px-3 border border-slate-200">Description</th>
                <th className="py-2 px-2 border border-slate-200 w-20 text-center">HSN/SAC</th>
                <th className="py-2 px-2 border border-slate-200 w-16 text-right">Qty</th>
                <th className="py-2 px-2 border border-slate-200 w-20 text-right">Rate</th>
                <th className="py-2 px-2 border border-slate-200 w-24 text-right">Taxable</th>
                {taxType === 'INTRA' ? (
                  <>
                    <th className="py-2 px-2 border border-slate-200 w-20 text-right">CGST</th>
                    <th className="py-2 px-2 border border-slate-200 w-20 text-right">SGST</th>
                  </>
                ) : (
                  <th className="py-2 px-2 border border-slate-200 w-24 text-right">IGST</th>
                )}
                <th className="py-2 px-3 border border-slate-200 w-24 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="py-2 px-2 border border-slate-200 text-center text-slate-400 font-mono">
                    {idx + 1}
                  </td>
                  <td className="py-2 px-3 border border-slate-200 font-medium text-slate-800">
                    {item.description}
                  </td>
                  <td className="py-2 px-2 border border-slate-200 text-center font-mono text-slate-600">
                    {item.hsnSac || '—'}
                  </td>
                  <td className="py-2 px-2 border border-slate-200 text-right font-mono text-slate-700">
                    {item.quantity} {item.unit || ''}
                  </td>
                  <td className="py-2 px-2 border border-slate-200 text-right font-mono text-slate-700">
                    {Number(item.rate || 0).toFixed(2)}
                  </td>
                  <td className="py-2 px-2 border border-slate-200 text-right font-mono text-slate-800">
                    {Number(item.taxableAmount || 0).toFixed(2)}
                  </td>
                  {taxType === 'INTRA' ? (
                    <>
                      <td className="py-2 px-2 border border-slate-200 text-right font-mono text-slate-700">
                        <span className="text-[10px] text-slate-400 block">{item.cgstRate}%</span>
                        {Number(item.cgstAmount || 0).toFixed(2)}
                      </td>
                      <td className="py-2 px-2 border border-slate-200 text-right font-mono text-slate-700">
                        <span className="text-[10px] text-slate-400 block">{item.sgstRate}%</span>
                        {Number(item.sgstAmount || 0).toFixed(2)}
                      </td>
                    </>
                  ) : (
                    <td className="py-2 px-2 border border-slate-200 text-right font-mono text-slate-700">
                      <span className="text-[10px] text-slate-400 block">{item.igstRate}%</span>
                      {Number(item.igstAmount || 0).toFixed(2)}
                    </td>
                  )}
                  <td className="py-2 px-3 border border-slate-200 text-right font-mono font-bold text-slate-900">
                    {Number(item.totalAmount || 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Calculations & Words */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Total Amount in Words
              </p>
              <p className="text-xs font-semibold text-slate-900 mt-1 leading-snug">
                {numberToWords(invoice.netTotal ?? invoice.grandTotal)}
              </p>
            </div>

            {invoice.bankDetails && (invoice.bankDetails.accountNumber || invoice.bankDetails.upiId) && (
              <div className="p-3 bg-slate-50 rounded border border-slate-200 text-[11px] space-y-1">
                <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Bank & Payment Details
                </p>
                {invoice.bankDetails.bankName && (
                  <p>
                    <span className="text-slate-500">Bank:</span> {invoice.bankDetails.bankName}
                    {invoice.bankDetails.branch ? ` (${invoice.bankDetails.branch})` : ''}
                  </p>
                )}
                {invoice.bankDetails.accountNumber && (
                  <p>
                    <span className="text-slate-500">A/C No:</span> {invoice.bankDetails.accountNumber}
                    <span className="text-slate-500 ml-2">IFSC:</span> {invoice.bankDetails.ifscCode || '—'}
                  </p>
                )}
                {invoice.bankDetails.upiId && (
                  <p>
                    <span className="text-slate-500">UPI ID:</span> {invoice.bankDetails.upiId}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="border border-slate-200 rounded p-3 bg-slate-50 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600">Taxable Value:</span>
              <span className="font-mono text-slate-900">₹ {Number(invoice.taxableAmount || 0).toFixed(2)}</span>
            </div>
            {taxType === 'INTRA' ? (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-600">Total CGST:</span>
                  <span className="font-mono text-slate-900">₹ {Number(invoice.cgst || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Total SGST:</span>
                  <span className="font-mono text-slate-900">₹ {Number(invoice.sgst || 0).toFixed(2)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between">
                <span className="text-slate-600">Total IGST:</span>
                <span className="font-mono text-slate-900">₹ {Number(invoice.igst || 0).toFixed(2)}</span>
              </div>
            )}
            {invoice.roundOff && Math.abs(invoice.roundOff) > 0.001 && (
              <div className="flex justify-between text-slate-500">
                <span>Round Off:</span>
                <span className="font-mono">₹ {Number(invoice.roundOff).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-300">
              <span>Grand Total:</span>
              <span className="font-mono text-base">₹ {Number(invoice.netTotal ?? invoice.grandTotal).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Notes & Terms */}
        {(invoice.notes || invoice.terms) && (
          <div className="mt-6 pt-3 border-t border-slate-200 text-[11px] text-slate-600">
            <p className="font-bold text-slate-700 text-[10px] uppercase tracking-wider mb-1">
              Terms & Conditions
            </p>
            <p className="whitespace-pre-line leading-relaxed">{invoice.notes || invoice.terms}</p>
          </div>
        )}

        {/* Signatory */}
        <div className="mt-8 pt-4 flex justify-between items-end border-t border-slate-200">
          <p className="text-[10px] text-slate-400">
            This is a computer-generated tax invoice.
          </p>
          <div className="text-right">
            <p className="text-xs text-slate-600 mb-8">
              For <span className="font-semibold">{business.businessName || 'Business'}</span>
            </p>
            <p className="text-xs font-bold text-slate-800 border-t border-slate-400 pt-1 px-4 inline-block">
              Authorised Signatory
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
