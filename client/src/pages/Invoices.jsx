/**
 * Invoices.jsx — GST Tax Invoices List Page
 *
 * Design System:
 *  - Colors: strictly semantic tokens (bg, surface, border, text, muted, faint, accent, danger)
 *  - Layout: max-w-screen-xl px-4 sm:px-6 py-6 font-sans
 *  - Header: Invoices (20px/600) + record count (small muted text) + subtitle (14px muted) + Create Invoice button
 *  - Stat cards: 3 compact cards (p-4), label 13px muted with small dot, value 20px/600 tabular-nums in text-text
 *  - Filter bar: tabs and search on one row directly on page background
 *  - Table: 52px rows, 1px dividers, hover highlight, tabular-nums amounts, DD/MM/YYYY dates, kebab menu
 *  - Empty state: compact 240px, icon in 40px surface box, header button hidden when list empty
 *  - Loading: 5 skeleton rows
 *  - Error: inline message with Retry button
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus,
  Search,
  Eye,
  Edit3,
  Copy,
  Download,
  XCircle,
  FileText,
  X,
  AlertCircle,
  MoreHorizontal
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { invoicesApi } from '../api/invoices.api';
import { formatCurrency } from '../utils/currency';
import { useDebounce } from '../utils/useDebounce';
import { useAppNavigate } from '../utils/navigation';
import { Button } from '../components/invoice/InvoiceEditorUI';

// ── Format Date as DD/MM/YYYY ─────────────────────────────────────────────────
function formatDDMMYYYY(dateInput) {
  if (!dateInput) return '—';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) {
      const parts = String(dateInput).split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return String(dateInput);
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(dateInput);
  }
}

// ── Status Badge ──────────────────────────────────────────────────────────────
// Small rounded-md badge with a colored dot + text on muted tinted backgrounds
function StatusBadge({ status }) {
  const configs = {
    Paid: {
      dot: 'bg-emerald-400',
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    },
    Issued: {
      dot: 'bg-indigo-400',
      badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
    },
    Draft: {
      dot: 'bg-muted',
      badge: 'bg-border text-muted border-border'
    },
    Cancelled: {
      dot: 'bg-danger',
      badge: 'bg-danger/10 text-danger border-danger/20'
    }
  };

  const c = configs[status] || configs.Draft;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border ${c.badge}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} aria-hidden="true" />
      <span>{status || 'Draft'}</span>
    </span>
  );
}

// ── Kebab (⋯) Actions Menu ────────────────────────────────────────────────────
function RowKebabMenu({ invoice, onNavigate, onDownloadPDF, onDuplicate, onCancel }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const targetId = invoice._id || invoice.id;
  const isDraft = invoice.status === 'Draft';
  const isCancelled = invoice.status === 'Cancelled';

  return (
    <div ref={menuRef} className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Invoice actions"
        className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-text hover:bg-border transition-colors cursor-pointer"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-1 w-44 rounded-lg bg-surface border border-border shadow-2xl py-1 z-50 text-xs font-medium"
        >
          {/* View Details */}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onNavigate('invoice-details', targetId);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-text hover:bg-border transition-colors cursor-pointer text-left"
          >
            <Eye className="w-3.5 h-3.5 text-muted" />
            <span>View</span>
          </button>

          {/* Edit (Drafts only) */}
          {isDraft && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onNavigate('edit-invoice', targetId);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-text hover:bg-border transition-colors cursor-pointer text-left"
            >
              <Edit3 className="w-3.5 h-3.5 text-muted" />
              <span>Edit</span>
            </button>
          )}

          {/* Download PDF */}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onDownloadPDF(invoice);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-text hover:bg-border transition-colors cursor-pointer text-left"
          >
            <Download className="w-3.5 h-3.5 text-muted" />
            <span>Download PDF</span>
          </button>

          {/* Duplicate */}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onDuplicate(invoice);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-text hover:bg-border transition-colors cursor-pointer text-left"
          >
            <Copy className="w-3.5 h-3.5 text-muted" />
            <span>Duplicate</span>
          </button>

          {/* Cancel */}
          {!isCancelled && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onCancel(invoice);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-danger hover:bg-danger/10 transition-colors cursor-pointer text-left border-t border-border mt-1 pt-1.5"
            >
              <XCircle className="w-3.5 h-3.5 text-danger" />
              <span>Cancel invoice</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Invoices Page Component
// ═══════════════════════════════════════════════════════════════════════════════

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

  // Track counts across statuses when viewing all
  const [statusCounts, setStatusCounts] = useState({
    ALL: 0,
    Paid: 0,
    Issued: 0,
    Draft: 0,
    Cancelled: 0
  });

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

      // When loading unfiltered list, compute live tab counts
      if (statusFilter === 'ALL' && !debouncedSearch) {
        const counts = { ALL: list.length, Paid: 0, Issued: 0, Draft: 0, Cancelled: 0 };
        list.forEach((inv) => {
          if (counts[inv.status] !== undefined) {
            counts[inv.status]++;
          }
        });
        setStatusCounts(counts);
      }
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

  const handleCancelInvoice = async (invoice) => {
    const targetId = invoice._id || invoice.id;
    if (window.confirm(`Are you sure you want to cancel invoice ${invoice.invoiceNumber}?`)) {
      try {
        await invoicesApi.update(targetId, { status: 'Cancelled' });
        loadInvoices();
      } catch (err) {
        alert(err.message || 'Failed to cancel invoice');
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

  // Check if initial list is completely empty (no search & no status filter)
  const isEntirelyEmpty = !loading && invoices.length === 0 && !search && statusFilter === 'ALL';

  return (
    <div className="w-full bg-bg text-text font-sans">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 py-6 space-y-6 pb-24 lg:pb-12">

        {/* ── 1. Page Header: Title + Subtitle on one block, icon-only '+' on mobile ── */}
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h1 className="text-[20px] font-semibold text-text tracking-tight leading-tight">
                Invoices
              </h1>
              <span className="text-xs font-normal text-muted">
                {summary.count} {summary.count === 1 ? 'record' : 'records'}
              </span>
            </div>
            <p className="text-sm text-muted mt-0.5">
              Manage tax invoices, monitor payment statuses, and download GST-compliant PDFs
            </p>
          </div>

          {!isEntirelyEmpty && (
            <Button
              variant="primary"
              size="md"
              aria-label="Create Invoice"
              onClick={() => onNavigate('create-invoice')}
              className="shrink-0 h-10 w-10 sm:w-auto p-0 sm:px-4 flex items-center justify-center rounded-lg"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Create Invoice</span>
            </Button>
          )}
        </div>

        {/* ── 2. Error Notice (inline with Retry button) ────────────────────── */}
        {error && (
          <div className="flex items-center justify-between rounded-lg border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm gap-3">
            <div className="flex items-center gap-2 text-danger min-w-0">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="truncate">Unable to load invoices. Please check your connection.</span>
            </div>
            <Button variant="secondary" size="sm" onClick={loadInvoices} className="shrink-0">
              Retry
            </Button>
          </div>
        )}

        {/* ── 3. Three Compact Stat Cards (1 col below sm, 3 cols from sm) ──── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* Total Billed */}
          <div className="rounded-xl border border-border bg-surface p-4 space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent shrink-0" aria-hidden="true" />
              <span className="text-[13px] font-medium text-muted">Total billed</span>
            </div>
            <div className="text-[20px] font-semibold text-text tabular-nums">
              {formatCurrency(summary.total)}
            </div>
          </div>

          {/* Paid */}
          <div className="rounded-xl border border-border bg-surface p-4 space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" aria-hidden="true" />
              <span className="text-[13px] font-medium text-muted">Paid</span>
            </div>
            <div className="text-[20px] font-semibold text-text tabular-nums">
              {formatCurrency(summary.paid)}
            </div>
          </div>

          {/* Outstanding */}
          <div className="rounded-xl border border-border bg-surface p-4 space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" aria-hidden="true" />
              <span className="text-[13px] font-medium text-muted">Outstanding</span>
            </div>
            <div className="text-[20px] font-semibold text-text tabular-nums">
              {formatCurrency(summary.outstanding)}
            </div>
          </div>
        </div>

        {/* ── 4. Filters & Search (tabs single row overflow-x-auto, search full width below on mobile) ── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Segmented Filter Tabs: single row, overflow-x-auto, tabs shrink-0, hide scrollbar */}
          <div className="w-full md:w-auto overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="inline-flex p-1 bg-surface rounded-lg border border-border min-w-max">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'Paid', label: 'Paid' },
                { id: 'Issued', label: 'Issued' },
                { id: 'Draft', label: 'Draft' },
                { id: 'Cancelled', label: 'Cancelled' }
              ].map((tab) => {
                const active = statusFilter === tab.id;
                const count = statusCounts[tab.id] ?? 0;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    className={`h-8 px-3 rounded-md text-xs font-medium cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
                      active
                        ? 'bg-border text-text font-semibold shadow-xs'
                        : 'text-muted hover:text-text'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`text-[11px] tabular-nums ${active ? 'text-text' : 'text-faint'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Bar: full width on its own row under tabs on mobile; 320px on desktop */}
          <div className="relative w-full md:w-80 shrink-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
            <input
              type="text"
              placeholder="Search by invoice # or customer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-8 text-sm font-normal text-text placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-text cursor-pointer p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── 5. Invoices Table Container (Single 1px border, rounded-xl) ────── */}
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          {loading ? (
            /* Skeleton Loading (5 Rows) */
            <div className="divide-y divide-border">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-[52px] flex items-center px-4 gap-6 animate-pulse">
                  <div className="h-3.5 bg-border rounded w-28" />
                  <div className="h-3.5 bg-border rounded w-40" />
                  <div className="h-3.5 bg-border rounded w-20" />
                  <div className="h-3.5 bg-border rounded w-20" />
                  <div className="h-3.5 bg-border rounded w-24 ml-auto" />
                  <div className="h-5 bg-border rounded-md w-16" />
                  <div className="h-6 bg-border rounded w-8" />
                </div>
              ))}
            </div>
          ) : invoices.length === 0 ? (
            /* Compact Empty State (~240px vertical space, 40px surface box) */
            <div className="min-h-[240px] flex flex-col items-center justify-center p-6 text-center">
              <div className="w-10 h-10 rounded-lg bg-surface border border-border flex items-center justify-center text-muted mb-3">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-text">
                {search || statusFilter !== 'ALL' ? 'No matching invoices' : 'No invoices yet'}
              </h3>
              <p className="text-xs text-muted mt-1 max-w-sm">
                {search || statusFilter !== 'ALL'
                  ? 'Try adjusting your filters or clearing your search query.'
                  : 'Get started by creating your first GST-compliant tax invoice.'}
              </p>

              {search || statusFilter !== 'ALL' ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('ALL');
                  }}
                  className="mt-4"
                >
                  Clear filters
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onNavigate('create-invoice')}
                  className="mt-4"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create invoice</span>
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table View (≥ md) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse" aria-label="Invoices list">
                  <thead>
                    <tr className="border-b border-border text-muted font-medium uppercase tracking-wider text-[11px]">
                      <th scope="col" className="py-3 px-4 font-medium">Invoice no.</th>
                      <th scope="col" className="py-3 px-4 font-medium">Customer</th>
                      <th scope="col" className="py-3 px-4 font-medium">Date</th>
                      <th scope="col" className="py-3 px-4 font-medium">Due date</th>
                      <th scope="col" className="py-3 px-4 font-medium text-right">Amount</th>
                      <th scope="col" className="py-3 px-4 font-medium">Status</th>
                      <th scope="col" className="py-3 px-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {invoices.map((inv) => {
                      const targetId = inv._id || inv.id;
                      const customerName = inv.customer?.name || inv.customerName || 'Walk-in Customer';
                      const net = Number(inv.netTotal ?? inv.grandTotal) || 0;

                      return (
                        <tr
                          key={targetId}
                          onClick={() => onNavigate('invoice-details', targetId)}
                          className="h-[52px] hover:bg-bg transition-colors cursor-pointer group"
                        >
                          {/* Invoice No. */}
                          <td className="py-2 px-4 font-medium text-text whitespace-nowrap">
                            {inv.invoiceNumber || 'INV-DRAFT'}
                          </td>

                          {/* Customer */}
                          <td className="py-2 px-4 text-text whitespace-nowrap">
                            <span className="font-normal truncate max-w-[200px] inline-block align-middle">
                              {customerName}
                            </span>
                          </td>

                          {/* Date DD/MM/YYYY */}
                          <td className="py-2 px-4 text-muted whitespace-nowrap">
                            {formatDDMMYYYY(inv.invoiceDate)}
                          </td>

                          {/* Due Date DD/MM/YYYY */}
                          <td className="py-2 px-4 text-muted whitespace-nowrap">
                            {inv.dueDate ? formatDDMMYYYY(inv.dueDate) : 'Immediate'}
                          </td>

                          {/* Amount (right-aligned, tabular-nums) */}
                          <td className="py-2 px-4 font-medium text-text tabular-nums text-right whitespace-nowrap">
                            {formatCurrency(net)}
                          </td>

                          {/* Status Badge */}
                          <td className="py-2 px-4 whitespace-nowrap">
                            <StatusBadge status={inv.status} />
                          </td>

                          {/* Actions Kebab Menu */}
                          <td className="py-2 px-4 text-right whitespace-nowrap">
                            <RowKebabMenu
                              invoice={inv}
                              onNavigate={onNavigate}
                              onDownloadPDF={handleDownloadPDF}
                              onDuplicate={handleDuplicate}
                              onCancel={handleCancelInvoice}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Stacked Card View (< md) */}
              <div className="md:hidden divide-y divide-border">
                {invoices.map((inv) => {
                  const targetId = inv._id || inv.id;
                  const customerName = inv.customer?.name || inv.customerName || 'Walk-in Customer';
                  const net = Number(inv.netTotal ?? inv.grandTotal) || 0;

                  return (
                    <div
                      key={targetId}
                      onClick={() => onNavigate('invoice-details', targetId)}
                      className="p-4 space-y-2 hover:bg-bg transition-colors cursor-pointer"
                    >
                      {/* Top: Invoice No. + Status + Actions */}
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-text text-sm">
                          {inv.invoiceNumber || 'INV-DRAFT'}
                        </span>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={inv.status} />
                          <RowKebabMenu
                            invoice={inv}
                            onNavigate={onNavigate}
                            onDownloadPDF={handleDownloadPDF}
                            onDuplicate={handleDuplicate}
                            onCancel={handleCancelInvoice}
                          />
                        </div>
                      </div>

                      {/* Customer Name */}
                      <div className="text-sm font-normal text-muted truncate">
                        {customerName}
                      </div>

                      {/* Date & Amount */}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                        <span className="text-muted">
                          {formatDDMMYYYY(inv.invoiceDate)}
                          {inv.dueDate ? ` · Due ${formatDDMMYYYY(inv.dueDate)}` : ''}
                        </span>
                        <span className="text-sm font-semibold text-text tabular-nums text-right">
                          {formatCurrency(net)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}

export default Invoices;
