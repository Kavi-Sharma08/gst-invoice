import React, { useState, useEffect } from 'react';
import { Plus, FileText, ArrowUpRight, Users, Eye, Download, Copy, Trash2, Cloud, HardDrive } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { InvoiceStatusBadge } from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import { invoicesApi } from '../api/invoices.api';
import { customersApi } from '../api/customers.api';
import { getInvoices, deleteInvoice, duplicateInvoice } from '../db/invoices';
import { getCustomers } from '../db/customers';
import { formatCurrency } from '../utils/currency';
import { formatDate, isThisMonth } from '../utils/date';
import { generateNextInvoiceNumber } from '../utils/invoiceNumber';
import { getSettings } from '../db/settings';
import { useAppNavigate } from '../utils/navigation';

export function Dashboard({ onNavigate: propOnNavigate }) {
  const appNavigate = useAppNavigate();
  const onNavigate = propOnNavigate || appNavigate;
  const { isAuthenticated } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [customersCount, setCustomersCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [isAuthenticated]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (isAuthenticated) {
        try {
          const [invRes, custRes] = await Promise.all([
            invoicesApi.list({ limit: 50 }),
            customersApi.list({ limit: 100 })
          ]);
          setInvoices(Array.isArray(invRes?.data) ? invRes.data : []);
          setCustomersCount(custRes?.pagination?.total ?? (custRes?.data?.length || 0));
          return;
        } catch (apiErr) {
          console.warn('API error, falling back to local database:', apiErr);
        }
      }

      const [invList, custList] = await Promise.all([
        getInvoices(),
        getCustomers()
      ]);
      setInvoices(invList || []);
      setCustomersCount(custList?.length || 0);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
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
        loadData();
      } catch (err) {
        alert(err.message || 'Failed to delete invoice');
      }
    }
  };

  // Metrics calculation
  const invoicesThisMonth = Array.isArray(invoices) ? invoices.filter((i) => isThisMonth(i.invoiceDate)) : [];
  const totalBilledThisMonth = invoicesThisMonth.reduce(
    (sum, i) => sum + (Number(i.netTotal ?? i.grandTotal) || 0),
    0
  );
  const totalTaxThisMonth = invoicesThisMonth.reduce(
    (sum, i) => sum + (Number(i.totalTax) || 0),
    0
  );
  const allTimeTotal = invoices.reduce(
    (sum, i) => sum + (Number(i.netTotal ?? i.grandTotal) || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Dashboard</h1>
            {isAuthenticated ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <Cloud className="w-3 h-3 text-emerald-600" /> Cloud Sync Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                <HardDrive className="w-3 h-3 text-slate-500" /> Offline Browser Storage
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAuthenticated
              ? 'Synchronized with your MongoDB cloud database'
              : 'Local invoice management • 100% stored on this device'}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button onClick={() => onNavigate('create-invoice')}>
            <Plus className="w-4 h-4 mr-1.5" />
            Create Invoice
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Billed This Month</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">
            {formatCurrency(totalBilledThisMonth)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {invoicesThisMonth.length} {invoicesThisMonth.length === 1 ? 'invoice' : 'invoices'} created in current month
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Tax Collected (Month)</span>
            <span className="text-xs font-mono font-medium text-slate-400">GST</span>
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">
            {formatCurrency(totalTaxThisMonth)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            CGST, SGST & IGST this month
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">All-Time Revenue</span>
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">
            {formatCurrency(allTimeTotal)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Across {invoices.length} total {invoices.length === 1 ? 'invoice' : 'invoices'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Saved Clients</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">
            {customersCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {isAuthenticated ? 'In cloud customer directory' : 'In local customer directory'}
          </div>
        </div>
      </div>

      {/* Recent Invoices Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Recent Invoices</h2>
          {invoices.length > 5 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('invoices')}
              className="text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              View all ({invoices.length})
            </Button>
          )}
        </div>

        {invoices.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-10 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-500">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">No invoices yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Create your first GST invoice and it will appear here.
            </p>
            <Button onClick={() => onNavigate('create-invoice')}>
              <Plus className="w-4 h-4 mr-1.5" />
              Create First Invoice
            </Button>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-2.5 px-4">Invoice No.</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3 text-right">Taxable</th>
                  <th className="py-2.5 px-3 text-right">GST</th>
                  <th className="py-2.5 px-4 text-right">Grand Total</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.slice(0, 10).map((inv) => {
                  const targetId = inv._id || inv.id;
                  return (
                    <tr key={targetId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-slate-900">
                        <button
                          onClick={() => onNavigate('invoice-details', targetId)}
                          className="hover:underline text-slate-900 text-left font-mono cursor-pointer"
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
                            title="View Invoice"
                          >
                            <Eye className="w-3.5 h-3.5" />
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
                            title="Duplicate Invoice"
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
    </div>
  );
}

export default Dashboard;
