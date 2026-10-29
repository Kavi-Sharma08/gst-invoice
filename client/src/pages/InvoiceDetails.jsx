import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Download,
  Printer,
  Edit3,
  Copy,
  Trash2,
  CheckCircle2,
  Mail,
  Send,
  Loader2,
  AlertCircle,
  Clock,
  XCircle,
  RefreshCw,
  X
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { InvoiceStatusBadge } from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import { invoicesApi } from '../api/invoices.api';



import { formatDate } from '../utils/date';
import { getStateByName, getStateByCode } from '../gst/taxRules';
import { useParams } from 'react-router-dom';
import { useAppNavigate } from '../utils/navigation';

export function InvoiceDetails({ invoiceId: propInvoiceId, onNavigate: propOnNavigate }) {
  const params = useParams();
  const appNavigate = useAppNavigate();
  const onNavigate = propOnNavigate || appNavigate;
  const invoiceId = propInvoiceId || params.id;
  const { isAuthenticated } = useAuth();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  // Email modal and delivery status state
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({
    recipientEmail: '',
    recipientName: '',
    subject: '',
    message: ''
  });
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState(null);
  const [deliveryStatus, setDeliveryStatus] = useState(null);
  const pollingRef = useRef(null);

  const [error, setError] = useState(null);

  useEffect(() => {
    loadInvoice();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [invoiceId, isAuthenticated]);

  const loadInvoice = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await invoicesApi.get(invoiceId);
      const data = res?.data || null;

      if (!data) {
        setError('Invoice not found.');
      }
      setInvoice(data);

      if (data) {
        setEmailForm({
          recipientEmail: data.customer?.email || '',
          recipientName: data.customer?.name || '',
          subject: `Invoice ${data.invoiceNumber} from ${data.business?.businessName || 'Business'}`,
          message: `Dear ${data.customer?.name || 'Customer'},\n\nPlease find attached details for Tax Invoice ${data.invoiceNumber}.\nTotal Amount: ₹${Number(data.netTotal ?? data.grandTotal).toFixed(2)}.\n\nThank you for your business!`
        });

        // Initialize delivery status if available on model
        if (data.emailDeliveryStatus && data.emailDeliveryStatus !== 'NOT_QUEUED') {
          setDeliveryStatus({
            status: data.emailDeliveryStatus,
            recipientEmail: data.emailLastSentTo,
            sentAt: data.emailLastSentAt
          });
          if (['PENDING', 'PROCESSING', 'RETRY_SCHEDULED'].includes(data.emailDeliveryStatus)) {
            startPollingStatus(invoiceId);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load invoice:', err);
    } finally {
      setLoading(false);
    }
  };

  const startPollingStatus = (id) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const res = await invoicesApi.getEmailStatus(id);
        const job = res?.data;
        if (job) {
          setDeliveryStatus(job);
          if (['SENT', 'FAILED_PERMANENTLY', 'CANCELLED'].includes(job.status)) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }
      } catch (err) {
        console.warn('Failed to poll email status:', err);
      }
    }, 4000);
  };

  const handleDownloadPDF = async () => {
    if (!invoice) return;
    try {
      const { generateInvoicePDF } = await import('../pdf/generateInvoicePDF');
      generateInvoicePDF(invoice, { action: 'download' });
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Failed to generate invoice PDF.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleStatusToggle = async () => {
    if (!invoice) return;
    const targetId = invoice._id || invoice.id;
    const newStatus = invoice.status === 'Paid' ? 'Issued' : 'Paid';

    try {
      await invoicesApi.update(targetId, { status: newStatus });
      setInvoice({ ...invoice, status: newStatus });
    } catch {
      alert('Failed to update status');
    }
  };

  const handleDuplicate = async () => {
    try {
      const targetId = invoice._id || invoice.id;
      const res = await invoicesApi.duplicate(targetId);
      const newId = res?.data?._id || res?.data?.id;
      onNavigate('edit-invoice', newId);
    } catch (err) {
      alert(err.message || 'Failed to duplicate invoice');
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete invoice ${invoice.invoiceNumber}?`)) {
      try {
        const targetId = invoice._id || invoice.id;
        await invoicesApi.delete(targetId);
        onNavigate('invoices');
      } catch (err) {
        alert(err.message || 'Failed to delete invoice');
      }
    }
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!invoice) return;

    if (!isAuthenticated) {
      alert('Email delivery requires a free BillGST account. Please sign in or create an account first.');
      onNavigate('login');
      return;
    }

    const targetId = invoice._id || invoice.id;
    setIsSendingEmail(true);
    setEmailFeedback(null);

    try {
      const res = await invoicesApi.sendEmail(targetId, {
        recipientEmail: emailForm.recipientEmail,
        recipientName: emailForm.recipientName,
        subject: emailForm.subject,
        message: emailForm.message
      });

      setEmailFeedback({
        type: 'success',
        message: 'Email has been queued for delivery! The email worker will process and dispatch it shortly.'
      });

      setDeliveryStatus({
        status: 'PENDING',
        recipientEmail: emailForm.recipientEmail,
        attempts: 0
      });

      startPollingStatus(targetId);
      setTimeout(() => {
        setIsEmailModalOpen(false);
      }, 2000);
    } catch (err) {
      setEmailFeedback({
        type: 'error',
        message: err.message || 'Failed to enqueue invoice email. Please check the recipient address.'
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        <span>Loading invoice details...</span>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        Invoice not found.{' '}
        <button onClick={() => onNavigate('dashboard')} className="underline text-slate-800 cursor-pointer">
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
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-16">
      {/* Top Bar Actions — Glide Document Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-slate-200/80 no-print">
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
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 font-heading">
              {invoice.invoiceNumber}
            </h1>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Email button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEmailModalOpen(true)}
            className="text-xs"
          >
            <Mail className="w-3.5 h-3.5 mr-1 text-[var(--accent)]" />
            Send Email
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleStatusToggle}
            className="text-xs"
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
            {invoice.status === 'Paid' ? 'Mark Unpaid' : 'Mark Paid'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('edit-invoice', invoice._id || invoice.id)}
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
            className="text-xs shadow-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            Download PDF
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="text-xs text-rose-600 hover:bg-rose-50"
            title="Delete Invoice"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Live Email Delivery Status Banner */}
      {deliveryStatus && (
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-center justify-between no-print transition-all ${
            deliveryStatus.status === 'SENT'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : deliveryStatus.status === 'FAILED_PERMANENTLY'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : deliveryStatus.status === 'RETRY_SCHEDULED'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {deliveryStatus.status === 'SENT' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : deliveryStatus.status === 'FAILED_PERMANENTLY' ? (
              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : deliveryStatus.status === 'RETRY_SCHEDULED' ? (
              <RefreshCw className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
            ) : (
              <Clock className="w-4 h-4 text-blue-600 animate-pulse shrink-0" />
            )}

            <div>
              <span className="font-semibold">
                Email Delivery Status: {deliveryStatus.status}
              </span>
              <p className="text-[11px] opacity-90 mt-0.5">
                {deliveryStatus.status === 'SENT' &&
                  `Delivered to ${deliveryStatus.recipientEmail || 'customer'} at ${
                    deliveryStatus.sentAt ? formatDate(deliveryStatus.sentAt) : 'recently'
                  }.`}
                {deliveryStatus.status === 'PENDING' &&
                  `Queued for delivery to ${deliveryStatus.recipientEmail}. Processing worker will deliver shortly.`}
                {deliveryStatus.status === 'PROCESSING' &&
                  `Currently transmitting email to ${deliveryStatus.recipientEmail}...`}
                {deliveryStatus.status === 'RETRY_SCHEDULED' &&
                  `Temporary delivery failure (attempt ${deliveryStatus.attempts || 1}). Retrying with backoff.`}
                {deliveryStatus.status === 'FAILED_PERMANENTLY' &&
                  `Email delivery failed permanently: ${deliveryStatus.lastError || 'Undeliverable'}.`}
              </p>
            </div>
          </div>

          {['PENDING', 'PROCESSING', 'RETRY_SCHEDULED'].includes(deliveryStatus.status) && (
            <span className="text-[11px] font-mono text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded">
              Live tracking...
            </span>
          )}
        </div>
      )}

      {/* Embedded Invoice Sheet — Glide Paper Canvas */}
      <div className="bg-white p-6 sm:p-10 shadow-sm border border-slate-200/90 rounded-2xl text-slate-900 text-xs print-page">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
              ₹
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-slate-900 uppercase font-heading">
                Tax Invoice
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Issued under Section 31 of CGST Act, 2017</p>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block text-[11px] font-semibold text-slate-700 border border-slate-200 px-3 py-1 rounded-full bg-slate-50">
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
                  <td className="py-2 px-3 border border-slate-200 font-medium text-slate-800 whitespace-pre-line leading-relaxed">
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

      {/* Email Invoice Modal */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Email Tax Invoice</h3>
                  <p className="text-[11px] text-slate-500 font-mono">{invoice.invoiceNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setIsEmailModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendEmail} className="p-5 space-y-3.5 text-xs">
              {emailFeedback && (
                <div
                  className={`p-3 rounded-md text-xs flex items-start gap-2 ${
                    emailFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {emailFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  )}
                  <span>{emailFeedback.message}</span>
                </div>
              )}

              <div>
                <Input
                  label="Recipient Email"
                  id="email-recipient"
                  type="email"
                  placeholder="customer@example.com"
                  required
                  value={emailForm.recipientEmail}
                  onChange={(e) => setEmailForm({ ...emailForm, recipientEmail: e.target.value })}
                />
              </div>

              <div>
                <Input
                  label="Recipient Name"
                  id="email-name"
                  type="text"
                  placeholder="Customer Name"
                  value={emailForm.recipientName}
                  onChange={(e) => setEmailForm({ ...emailForm, recipientName: e.target.value })}
                />
              </div>

              <div>
                <Input
                  label="Subject"
                  id="email-subject"
                  type="text"
                  required
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Message / Cover Note
                </label>
                <textarea
                  rows={4}
                  value={emailForm.message}
                  onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
                  className="w-full text-xs rounded-md border border-slate-300 p-2.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEmailModalOpen(false)}
                  disabled={isSendingEmail}
                  className="text-xs"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  size="sm"
                  disabled={isSendingEmail}
                  className="text-xs bg-slate-900 text-white hover:bg-slate-800"
                >
                  {isSendingEmail ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Queuing...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      Queue & Send
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default InvoiceDetails;
