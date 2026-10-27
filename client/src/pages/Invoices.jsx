import React, { useState, useEffect } from 'react';
import { Plus, Search, Eye, Edit3, Copy, Download, Trash2, FileText, Cloud, HardDrive } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { InvoiceStatusBadge } from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import { invoicesApi } from '../api/invoices.api';
import { getInvoices, deleteInvoice, duplicateInvoice } from '../db/invoices';
import { getSettings } from '../db/settings';
import { generateNextInvoiceNumber } from '../utils/invoiceNumber';
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
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    loadInvoices();
  }, [debouncedSearch, statusFilter, isAuthenticated]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      if (isAuthenticated) {
        try {
          const params = {};
          if (debouncedSearch) params.search = debouncedSearch;
          if (statusFilter !== 'ALL') params.status = statusFilter;
          const res = await invoicesApi.list(params);
          setInvoices(Array.isArray(res?.data) ? res.data : []);
          return;
        } catch (apiErr) {
          console.warn('API error, falling back to local database:', apiErr);
        }
      }

      const list = await getInvoices({
        search: debouncedSearch,
        status: statusFilter
      });
      setInvoices(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load invoices:', err);
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
      if (isAuthenticated && invoice._id) {
        const res = await invoicesApi.duplicate(targetId);
        onNavigate('edit-invoice', res?.data?._id);
      } else {
        const settings = await getSettings();
        const allInvoices = await getInvoices();
        const newNum = generateNextInvoiceNumber(
          settings.invoicePrefix,
          settings.startingNumber,
          allInvoices
        );
        const dup = await duplicateInvoice(targetId, newNum);
        onNavigate('edit-invoice', dup.id);
      }
    } catch (err) {
      alert(err.message || 'Failed to duplicate invoice');
    }
  };

  const handleDelete = async (invoice) => {
    const targetId = invoice._id || invoice.id;
    if (window.confirm(`Are you sure you want to delete invoice ${invoice.invoiceNumber}? This cannot be undone.`)) {
      try {
        if (isAuthenticated && invoice._id) {
          await invoicesApi.delete(targetId);
        } else {
          await deleteInvoice(targetId);
        }
        loadInvoices();
      } catch (err) {
        alert(err.message || 'Failed to delete invoice');
      }
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Invoices</h1>
            {isAuthenticated ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <Cloud className="w-3 h-3 text-emerald-600" /> Cloud
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                <HardDrive className="w-3 h-3 text-slate-500" /> Local
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your issued and draft GST invoices
          </p>
        </div>
        <Button onClick={() => onNavigate('create-invoice')}>
          <Plus className="w-4 h-4 mr-1.5" />
          Create Invoice
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by invoice number, customer name, GSTIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-slate-300 focus:outline-none focus:border-slate-800"
          />
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs text-slate-500">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs rounded-md border border-slate-300 py-1.5 px-2.5 bg-white text-slate-800 focus:outline-none focus:border-slate-800"
          >
            <option value="ALL">All Statuses</option>
            <option value="Issued">Issued</option>
            <option value="Paid">Paid</option>
            <option value="Draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      {invoices.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-500">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">
            {search || statusFilter !== 'ALL' ? 'No matching invoices' : 'No invoices yet'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            {search || statusFilter !== 'ALL'
              ? 'Try adjusting your search query or filter.'
              : 'Create your first GST invoice in seconds.'}
          </p>
          {!search && statusFilter === 'ALL' && (
            <Button onClick={() => onNavigate('create-invoice')}>
              <Plus className="w-4 h-4 mr-1.5" />
              Create Invoice
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-2.5 px-4">Invoice No.</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3 text-right">Taxable Amount</th>
                <th className="py-2.5 px-3 text-right">Tax (GST)</th>
                <th className="py-2.5 px-4 text-right">Grand Total</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => {
                const targetId = inv._id || inv.id;
                return (
                  <tr key={targetId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">
                      <button
                        onClick={() => onNavigate('invoice-details', targetId)}
                        className="hover:underline text-slate-900 text-left cursor-pointer"
                      >
                        {inv.invoiceNumber}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {formatDate(inv.invoiceDate)}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-800">
                      <div>{inv.customer?.name || 'Walk-in Customer'}</div>
                      {inv.customer?.gstin && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {inv.customer.gstin}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600">
                      {formatCurrency(inv.taxableAmount)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600">
                      {formatCurrency(inv.totalTax)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(inv.netTotal ?? inv.grandTotal)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <InvoiceStatusBadge status={inv.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onNavigate('invoice-details', targetId)}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 cursor-pointer"
                          title="View"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onNavigate('edit-invoice', targetId)}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 cursor-pointer"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDownloadPDF(inv)}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 cursor-pointer"
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDuplicate(inv)}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 cursor-pointer"
                          title="Duplicate"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(inv)}
                          className="p-1.5 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
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
  );
}

export default Invoices;
