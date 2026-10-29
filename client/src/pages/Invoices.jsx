import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  Eye,
  Edit3,
  Copy,
  Download,
  Trash2,
  FileText,
  X,
  ArrowUpRight,
  Filter,
  AlertCircle
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { InvoiceStatusBadge } from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import { invoicesApi } from '../api/invoices.api';
import { formatCurrency } from '../utils/currency';
import { formatDate } from '../utils/date';
import { useDebounce } from '../utils/useDebounce';
import { useAppNavigate } from '../utils/navigation';

export function Invoices({ onNavigate: propOnNavigate }) {
  const appNavigate = useAppNavigate();
  const onNavigate = propOnNavigate || appNavigate;
  const { isAuthenticated } = useAuth();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    loadInvoices();
  }, [debouncedSearch, statusFilter, isAuthenticated]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const res = await invoicesApi.list(params);
      const list = Array.isArray(res?.data) ? res.data : (res?.data?.invoices || []);
      setInvoices(list);
    } catch (err) {
      console.error('Failed to load invoices:', err);
      setError(err.message || 'Failed to load invoices. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (invoice) => {
    try {
      const { generateInvoicePDF } = await import('../pdf/generateInvoicePDF');
      generateInvoicePDF(invoice, { action: 'download' });
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Failed to generate invoice PDF.');
    }
  };

  const handleDuplicate = async (invoice) => {
    try {
      const targetId = invoice._id || invoice.id;
      const res = await invoicesApi.duplicate(targetId);
      const newId = res?.data?._id || res?.data?.id;
      onNavigate('edit-invoice', newId);
    } catch (err) {
      alert(err.message || 'Failed to duplicate invoice');
    }
  };

  const handleDelete = async (invoice) => {
    const targetId = invoice._id || invoice.id;
    if (window.confirm(`Are you sure you want to delete invoice ${invoice.invoiceNumber}? This cannot be undone.`)) {
      try {
        await invoicesApi.delete(targetId);
        loadInvoices();
      } catch (err) {
        alert(err.message || 'Failed to delete invoice');
      }
    }
  };

  // Summary Metrics of loaded invoices
  const summary = useMemo(() => {
    let total = 0;
    let paid = 0;
    let outstanding = 0;

    (invoices || []).forEach((inv) => {
      const amt = Number(inv.netTotal ?? inv.grandTotal) || 0;
      total += amt;
      if (inv.status === 'Paid') {
        paid += amt;
      } else if (inv.status !== 'Cancelled') {
        outstanding += amt;
      }
    });

    return { total, paid, outstanding, count: invoices.length };
  }, [invoices]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-heading">
              Invoices
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {summary.count} {summary.count === 1 ? 'record' : 'records'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage tax invoices, monitor payment statuses, and download GST-compliant PDFs
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => onNavigate('create-invoice')}
          className="text-xs shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Create Invoice
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="outline" onClick={loadInvoices} className="text-xs">
            Retry
          </Button>
        </div>
      )}

      {/* ── Summary Strip (Glide Cards) ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glide-card p-4">
          <span className="text-xs font-medium text-slate-500">Total Billed</span>
          <div className="text-xl font-extrabold text-slate-950 mt-1 tabular-nums font-heading">
            {formatCurrency(summary.total)}
          </div>
        </div>
        <div className="glide-card p-4">
          <span className="text-xs font-medium text-emerald-700">Total Settled (Paid)</span>
          <div className="text-xl font-extrabold text-emerald-950 mt-1 tabular-nums font-heading">
            {formatCurrency(summary.paid)}
          </div>
        </div>
        <div className="glide-card p-4">
          <span className="text-xs font-medium text-amber-700">Outstanding Balance</span>
          <div className="text-xl font-extrabold text-amber-950 mt-1 tabular-nums font-heading">
            {formatCurrency(summary.outstanding)}
          </div>
        </div>
      </div>

      {/* ── Filter Bar & Search — Glide Segmented Pills ─────────────────────── */}
      <div className="glide-card p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Segmented Status Pill Bar */}
        <div className="inline-flex p-1 bg-slate-100/90 rounded-full border border-slate-200/70 overflow-x-auto self-start">
          {[
            { id: 'ALL', label: 'All Invoices' },
            { id: 'Paid', label: 'Paid' },
            { id: 'Issued', label: 'Issued' },
            { id: 'Draft', label: 'Draft' },
            { id: 'Cancelled', label: 'Cancelled' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-all duration-150 cursor-pointer whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by invoice # or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs rounded-full border border-slate-200/90 bg-white pl-9 pr-8 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-3 focus:ring-slate-900/5 shadow-2xs"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Invoices Table ─────────────────────────────────────────────────── */}
      <div className="glide-card overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading invoices...</div>
        ) : invoices.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 font-heading">
              {search || statusFilter !== 'ALL' ? 'No matching invoices' : 'No invoices yet'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {search || statusFilter !== 'ALL'
                ? 'Try adjusting your filters or clearing search query.'
                : 'Get started by creating your first GST-compliant tax invoice.'}
            </p>
            {(!search && statusFilter === 'ALL') && (
              <Button
                size="sm"
                onClick={() => onNavigate('create-invoice')}
                className="mt-4 text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Create First Invoice
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" aria-label="Invoices list">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th scope="col" className="py-3 px-4">Invoice #</th>
                  <th scope="col" className="py-3 px-4">Customer</th>
                  <th scope="col" className="py-3 px-4">Date</th>
                  <th scope="col" className="py-3 px-4">Tax Type</th>
                  <th scope="col" className="py-3 px-4">GST Tax</th>
                  <th scope="col" className="py-3 px-4">Net Total</th>
                  <th scope="col" className="py-3 px-4">Status</th>
                  <th scope="col" className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => {
                  const targetId = inv._id || inv.id;
                  const customerName = inv.customer?.name || inv.customerName || 'Walk-in Customer';
                  const taxType = inv.taxType === 'INTER' ? 'IGST' : 'CGST+SGST';
                  const net = Number(inv.netTotal ?? inv.grandTotal) || 0;
                  const tax = Number(inv.totalTax) || 0;

                  return (
                    <tr
                      key={targetId}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => onNavigate('invoice-details', targetId)}
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                        {inv.invoiceNumber || 'INV-DRAFT'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {customerName.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-800 truncate max-w-[170px]">
                            {customerName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {formatDate(inv.invoiceDate)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          inv.taxType === 'INTER'
                            ? 'bg-[var(--accent-soft-bg)] text-[var(--accent-soft-text)] border border-[var(--accent)]/30'
                            : 'bg-[var(--surface-hover)] text-[var(--muted)] border border-[var(--border)]'
                        }`}>
                          {taxType}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-600 tabular-nums whitespace-nowrap">
                        {formatCurrency(tax)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-950 tabular-nums whitespace-nowrap">
                        {formatCurrency(net)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <InvoiceStatusBadge status={inv.status} />
                      </td>
                      <td
                        className="py-3.5 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onNavigate('invoice-details', targetId)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-950 hover:bg-slate-100 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onNavigate('edit-invoice', targetId)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-950 hover:bg-slate-100 transition-colors"
                            title="Edit Invoice"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDownloadPDF(inv)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-950 hover:bg-slate-100 transition-colors"
                            title="Download PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDuplicate(inv)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-950 hover:bg-slate-100 transition-colors"
                            title="Duplicate"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(inv)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Invoices;
