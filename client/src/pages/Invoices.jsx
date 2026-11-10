/**
 * Invoices.jsx — GST Tax Invoices List Page
 *
 * Design System:
 *  - Colors: strictly semantic tokens (bg, surface, border, text, muted, faint, accent, danger)
 *  - Layout: max-w-screen-xl px-4 sm:px-6 py-6 font-sans, flex-col min-h-full
 *  - Header: Invoices (20px/600) + record count (small muted) + "Create Invoice" button
 *  - Stat strip: 3-column bordered strip, p-4, label 13px muted with colored dot, value 20px/600 text-text tabular-nums
 *  - Filters: underline-style tabs (no pill border) + search (h-10 rounded-lg, full width below sm)
 *  - Grid: unified constant for header + data rows, px-4 gap-4, h-14, 1px dividers, hover surface
 *  - Pagination: shared Pagination component, sticky footer, page+q+status in URL
 *  - Empty states, loading skeletons, inline error with Retry
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, Link, useLocation } from 'react-router-dom';
import { PATHS } from '@/app/routes/paths';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
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
} from 'lucide-react';

import { useAuth } from '@/features/auth';
import { invoicesApi, invoiceQueryKeys } from '../api/invoices.api';
import { formatCurrency } from '../utils/currency';
import { useDebounce } from '../utils/useDebounce';
import { useAppNavigate } from '../utils/navigation';
import { Button } from '../components/invoice/InvoiceEditorUI';
import { DropdownMenu } from '../components/ui/DropdownMenu';
import { Pagination } from '../components/ui/Pagination';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { PageHeader } from '../components/layout/PageHeader';

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
function StatusBadge({ status }) {
  const configs = {
    Paid: {
      dot: 'bg-emerald-400',
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    },
    Issued: {
      dot: 'bg-indigo-400',
      badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    },
    Draft: {
      dot: 'bg-muted',
      badge: 'bg-border text-muted border-border',
    },
    Cancelled: {
      dot: 'bg-danger',
      badge: 'bg-danger/10 text-danger border-danger/20',
    },
  };

  const c = configs[status] || configs.Draft;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border ${c.badge}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} shrink-0`} aria-hidden="true" />
      <span>{status || 'Draft'}</span>
    </span>
  );
}

// ── Unified grid template: Invoice no. | Customer | Date | Due date | Amount | Status | Actions ──
const INVOICES_GRID =
  'grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_120px_48px] gap-4 px-4 items-center';

// ── Status filter tabs ────────────────────────────────────────────────────────
const STATUS_TABS = [
  { id: 'ALL', label: 'All' },
  { id: 'Paid', label: 'Paid' },
  { id: 'Issued', label: 'Issued' },
  { id: 'Draft', label: 'Draft' },
  { id: 'Cancelled', label: 'Cancelled' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Main Invoices Page Component
// ═══════════════════════════════════════════════════════════════════════════════

export function Invoices({ onNavigate: propOnNavigate }) {
  const location = useLocation();
  const appNavigate = useAppNavigate();
  const onNavigate = propOnNavigate || appNavigate;
  const { isAuthenticated, isLoaded, isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const isAuthReady = Boolean(isLoaded && isSignedIn);

  const [searchParams, setSearchParams] = useSearchParams();

  // Read initial state from URL
  const paramPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const parsedLimit = parseInt(searchParams.get('limit') || '10', 10) || 10;
  const paramLimit = [10, 25, 50].includes(parsedLimit) ? parsedLimit : 10;
  const paramQ = searchParams.get('q') || '';
  const paramStatus = searchParams.get('status') || 'ALL';

  const [page, setPage] = useState(paramPage);
  const [limit, setLimit] = useState(paramLimit);
  const [search, setSearch] = useState(paramQ);
  const [statusFilter, setStatusFilter] = useState(
    STATUS_TABS.find((t) => t.id.toLowerCase() === paramStatus.toLowerCase())?.id || 'ALL'
  );
  const debouncedSearch = useDebounce(search, 300);

  // Cancel confirm dialog
  const [cancelTarget, setCancelTarget] = useState(null); // invoice object
  const [cancelError, setCancelError] = useState('');

  // 1. URL Sync (updates URL without refetch loop)
  useEffect(() => {
    const params = {};
    if (page > 1) params.page = String(page);
    if (limit !== 10) params.limit = String(limit);
    if (debouncedSearch) params.q = debouncedSearch;
    if (statusFilter !== 'ALL') params.status = statusFilter.toLowerCase();
    setSearchParams(params, { replace: true });
  }, [page, limit, debouncedSearch, statusFilter, setSearchParams]);

  // 2. Query 1: Paginated invoice list (keeps previous page data while paginating)
  const listParams = useMemo(() => ({
    page,
    limit,
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
    q: debouncedSearch || undefined,
  }), [page, limit, statusFilter, debouncedSearch]);

  const {
    data: listResponse,
    isLoading: loading,
    isFetching,
    error: queryError,
    refetch: loadInvoices,
  } = useQuery({
    queryKey: invoiceQueryKeys.list(listParams),
    queryFn: () => invoicesApi.list(listParams),
    placeholderData: keepPreviousData,
    enabled: isAuthReady,
  });

  const invoices = useMemo(() => {
    const raw = listResponse?.data;
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.invoices)) return raw.invoices;
    return [];
  }, [listResponse]);

  const total = useMemo(() => {
    return listResponse?.meta?.total ?? listResponse?.data?.total ?? invoices.length;
  }, [listResponse, invoices.length]);

  const error = queryError?.message || null;

  // 3. Query 2: Status counts (parallel request, respects q but NOT status)
  const countsParams = useMemo(() => ({
    q: debouncedSearch || undefined,
  }), [debouncedSearch]);

  const { data: countsResponse } = useQuery({
    queryKey: invoiceQueryKeys.counts(countsParams),
    queryFn: () => invoicesApi.getCounts(countsParams),
    enabled: isAuthReady,
  });

  const statusCounts = useMemo(() => {
    const c = countsResponse?.data || {};
    return {
      ALL: c.all ?? total,
      Paid: c.paid ?? 0,
      Issued: c.issued ?? 0,
      Draft: c.draft ?? 0,
      Cancelled: c.cancelled ?? 0,
    };
  }, [countsResponse, total]);

  // 4. Query 3: Totals summary for stat strip (parallel request)
  const { data: summaryResponse } = useQuery({
    queryKey: invoiceQueryKeys.summary('all'),
    queryFn: () => invoicesApi.getSummary(),
    enabled: isAuthReady,
  });

  const summary = useMemo(() => {
    const s = summaryResponse?.data || {};
    return {
      total: s.totalBilled ?? 0,
      paid: s.paid ?? 0,
      outstanding: s.outstanding ?? 0,
    };
  }, [summaryResponse]);

  // Reset to page 1 when filters/search change
  const handleStatusChange = (id) => {
    setStatusFilter(id);
    setPage(1);
  };

  const handleSearchChange = (val) => {
    setSearch(val);
    setPage(1);
  };

  const handleLimitChange = (val) => {
    setLimit(val);
    setPage(1);
  };

  // ── Invoice actions / Mutations ──────────────────────────────────────────
  const handleDownloadPDF = async (invoice) => {
    try {
      const { generateInvoicePDF } = await import('../pdf/generateInvoicePDF');
      generateInvoicePDF(invoice, { action: 'download' });
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    }
  };

  const duplicateMutation = useMutation({
    mutationFn: (id) => invoicesApi.duplicate(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: invoiceQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['invoices', 'counts'] });
      queryClient.invalidateQueries({ queryKey: ['invoices', 'summary'] });
      const newId = res?.data?.id || res?.data?._id;
      if (newId) onNavigate('edit-invoice', newId);
    },
    onError: (err) => {
      console.error('Failed to duplicate invoice:', err);
    },
  });

  const handleDuplicate = (invoice) => {
    const targetId = invoice._id || invoice.id;
    if (targetId) duplicateMutation.mutate(targetId);
  };

  const cancelMutation = useMutation({
    mutationFn: (id) => invoicesApi.cancel(id),
    onSuccess: (res, id) => {
      queryClient.invalidateQueries({ queryKey: invoiceQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['invoices', 'counts'] });
      queryClient.invalidateQueries({ queryKey: ['invoices', 'summary'] });
      queryClient.invalidateQueries({ queryKey: invoiceQueryKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ['customers', 'list'] });
      setCancelTarget(null);
    },
    onError: (err) => {
      setCancelError(err.message || 'Failed to cancel invoice.');
    },
  });

  const cancelling = cancelMutation.isPending;

  const handleCancelConfirm = () => {
    if (!cancelTarget) return;
    const targetId = cancelTarget._id || cancelTarget.id;
    setCancelError('');
    cancelMutation.mutate(targetId);
  };

  // ── Build kebab menu items per invoice ────────────────────────────────────
  const getMenuItems = (inv) => {
    const targetId = inv._id || inv.id;
    const isDraft = inv.status === 'Draft';
    const isCancelled = inv.status === 'Cancelled';

    const items = [
      {
        label: 'View',
        icon: Eye,
        onSelect: () => onNavigate('invoice-details', targetId),
      },
    ];

    if (isDraft) {
      items.push({
        label: 'Edit',
        icon: Edit3,
        onSelect: () => onNavigate('edit-invoice', targetId),
      });
    }

    items.push({
      label: 'Download PDF',
      icon: Download,
      onSelect: () => handleDownloadPDF(inv),
    });

    items.push({
      label: 'Duplicate',
      icon: Copy,
      onSelect: () => handleDuplicate(inv),
    });

    if (!isCancelled) {
      items.push({
        label: 'Cancel invoice',
        icon: XCircle,
        danger: true,
        dividerBefore: true,
        onSelect: () => {
          setCancelError('');
          setCancelTarget(inv);
        },
      });
    }

    return items;
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const hasFilters = !!debouncedSearch || statusFilter !== 'ALL';
  const isEntirelyEmpty = !loading && !error && total === 0 && !hasFilters;
  const isNoMatch = !loading && !error && total === 0 && hasFilters;

  return (
    <div className="w-full bg-bg text-text font-sans flex flex-col min-h-full">
      <div className="mx-auto max-w-screen-xl w-full px-4 sm:px-6 py-6 space-y-6 pb-24 lg:pb-12 flex-1 flex flex-col">

        {/* ── 1. Page Header ──────────────────────────────────────────────── */}
        <PageHeader
          title="Invoices"
          count={total}
          hideTitleOnMobile
          actions={
            !isEntirelyEmpty && (
              <Button
                variant="primary"
                size="md"
                aria-label="Create Invoice"
                onClick={() => onNavigate('create-invoice')}
                className="shrink-0 h-10 w-10 sm:w-auto p-0 sm:px-4 flex items-center justify-center rounded-lg"
                title="Create Invoice"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Create Invoice</span>
              </Button>
            )
          }
        />

        {/* ── 2. Error Notice ─────────────────────────────────────────────── */}
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

        {/* ── 3. Stats Strip (3 equal cells, never stacks) ────────────────── */}
        {!isEntirelyEmpty && (
          <div className="grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-surface overflow-hidden">
            <div className="p-3 sm:p-4 space-y-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" aria-hidden="true" />
                <span className="text-xs sm:text-[13px] font-medium text-muted truncate">Total billed</span>
              </div>
              <div className="text-base sm:text-[20px] font-semibold text-text tabular-nums tracking-tight truncate">
                {formatCurrency(summary.total)}
              </div>
            </div>
            <div className="p-3 sm:p-4 space-y-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" aria-hidden="true" />
                <span className="text-xs sm:text-[13px] font-medium text-muted truncate">Paid</span>
              </div>
              <div className="text-base sm:text-[20px] font-semibold text-text tabular-nums tracking-tight truncate">
                {formatCurrency(summary.paid)}
              </div>
            </div>
            <div className="p-3 sm:p-4 space-y-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" aria-hidden="true" />
                <span className="text-xs sm:text-[13px] font-medium text-muted truncate">Outstanding</span>
              </div>
              <div className="text-base sm:text-[20px] font-semibold text-text tabular-nums tracking-tight truncate">
                {formatCurrency(summary.outstanding)}
              </div>
            </div>
          </div>
        )}

        {/* ── 4. Filters: Underline tabs + search ─────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Status filter tabs — underline style directly on page background */}
          <div className="flex items-center gap-0 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {STATUS_TABS.map((tab) => {
              const active = statusFilter === tab.id;
              const count = statusCounts[tab.id] ?? 0;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleStatusChange(tab.id)}
                  className={[
                    'flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 cursor-pointer transition-colors whitespace-nowrap shrink-0',
                    active
                      ? 'border-accent text-text font-semibold'
                      : 'border-transparent text-muted hover:text-text hover:border-border',
                  ].join(' ')}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[11px] tabular-nums font-normal ${
                      active ? 'text-muted' : 'text-faint'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-80 shrink-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
            <input
              type="text"
              placeholder="Search by invoice # or customer…"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-9 text-sm font-normal text-text placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
            />
            {search && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                title="Clear search"
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-text cursor-pointer p-0.5 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── 5. Invoice List (flex-1 to fill height) ──────────────────────── */}
        <div className="flex-1 min-w-0">
          {loading ? (
            /* 5a. Skeleton loading — 5 rows */
            <div className="divide-y divide-border">
              {/* Header skeleton */}
              <div className={`${INVOICES_GRID} py-3 border-b border-border`}>
                {[160, 180, 100, 100, 100, 70, 28].map((w, i) => (
                  <div
                    key={i}
                    className={`h-3 bg-border rounded animate-pulse ${i === 4 ? 'ml-auto' : ''}`}
                    style={{ width: w, maxWidth: '100%' }}
                  />
                ))}
              </div>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={`${INVOICES_GRID} h-14 animate-pulse`}>
                  <div className="h-3.5 bg-border rounded w-28" />
                  <div className="h-3.5 bg-border rounded w-36" />
                  <div className="h-3.5 bg-border rounded w-20" />
                  <div className="h-3.5 bg-border rounded w-20" />
                  <div className="h-3.5 bg-border rounded w-24 ml-auto" />
                  <div className="h-5 bg-border rounded-md w-16" />
                  <div className="h-7 w-7 bg-border rounded ml-auto" />
                </div>
              ))}
            </div>
          ) : error ? (
            /* 5b. Error state with retry */
            <div className="min-h-[240px] flex flex-col items-center justify-center p-6 text-center">
              <div className="w-10 h-10 rounded-lg bg-surface border border-danger/30 flex items-center justify-center text-danger mb-3">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-text">Failed to load invoices</h3>
              <p className="text-xs text-muted mt-1 max-w-sm">
                {error || 'Unable to load invoices. Please check your connection.'}
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={loadInvoices}
                className="mt-4"
              >
                Retry
              </Button>
            </div>
          ) : isEntirelyEmpty ? (
            /* 5c. Entirely empty — no invoices at all */
            <div className="min-h-[240px] flex flex-col items-center justify-center p-6 text-center">
              <div className="w-10 h-10 rounded-lg bg-surface border border-border flex items-center justify-center text-muted mb-3">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-text">No invoices yet</h3>
              <p className="text-xs text-muted mt-1 max-w-sm">
                Get started by creating your first GST-compliant tax invoice.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onNavigate('create-invoice')}
                className="mt-4"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create invoice</span>
              </Button>
            </div>
          ) : isNoMatch ? (
            /* 5c. No matches for current filters/search */
            <div className="min-h-[200px] flex flex-col items-center justify-center p-6 text-center">
              <div className="w-10 h-10 rounded-lg bg-surface border border-border flex items-center justify-center text-muted mb-3">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-text">No matching invoices</h3>
              <p className="text-xs text-muted mt-1 max-w-sm">
                Try adjusting your filters or clearing your search query.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  handleSearchChange('');
                  handleStatusChange('ALL');
                }}
                className="mt-4"
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <>
              {/* 5d. Desktop Grid Table (≥ md) */}
              <div className="hidden md:block">
                {/* Header row */}
                <div
                  className={`${INVOICES_GRID} py-3 border-b border-border text-[12px] font-medium text-muted uppercase tracking-wider`}
                >
                  <div>Invoice no.</div>
                  <div>Customer</div>
                  <div>Date</div>
                  <div>Due date</div>
                  <div className="text-right">Amount</div>
                  <div>Status</div>
                  <div className="flex justify-end">
                    <span className="sr-only">Actions</span>
                  </div>
                </div>

                {/* Data rows */}
                <div className="divide-y divide-border">
                  {invoices.map((inv) => {
                    const targetId = inv._id || inv.id;
                    const isDraft = inv.status === 'Draft';
                    const customerName = inv.customer?.name || inv.customerName || 'Walk-in Customer';
                    const hasCustomerId = !!(inv.customerId || inv.customer?.id || inv.customer?._id);
                    const net = Number(inv.netTotal ?? inv.grandTotal) || 0;
                    const handleRowClick = () =>
                      onNavigate(isDraft ? 'edit-invoice' : 'invoice-details', targetId, {
                        state: { from: location.pathname + location.search }
                      });

                    return (
                      <div
                        key={targetId}
                        role="button"
                        tabIndex={0}
                        onClick={handleRowClick}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleRowClick(); }}
                        className={`${INVOICES_GRID} h-14 hover:bg-surface/50 transition-colors cursor-pointer text-xs focus:outline-none focus:bg-surface/50`}
                      >
                        {/* Invoice no. */}
                        <div
                          className="font-medium text-text truncate"
                          title={inv.invoiceNumber || 'INV-DRAFT'}
                        >
                          <Link
                            to={isDraft ? PATHS.APP.invoiceEdit(targetId) : PATHS.APP.invoice(targetId)}
                            state={{ from: location.pathname + location.search }}
                            onClick={(e) => e.stopPropagation()}
                            className="hover:underline hover:text-accent font-medium text-text truncate inline-block max-w-full"
                          >
                            {inv.invoiceNumber || 'INV-DRAFT'}
                          </Link>
                        </div>

                        {/* Customer — links to customer page when real customer id exists */}
                        <div className="min-w-0">
                          {hasCustomerId ? (
                            <span
                              role="link"
                              tabIndex={-1}
                              onClick={(e) => {
                                e.stopPropagation();
                                const custId = inv.customerId || inv.customer?.id || inv.customer?._id;
                                onNavigate('customers', custId);
                              }}
                              title={customerName}
                              className="font-normal text-text hover:text-accent hover:underline truncate block cursor-pointer"
                            >
                              {customerName}
                            </span>
                          ) : (
                            <span className="font-normal text-muted truncate block" title={customerName}>
                              {customerName}
                            </span>
                          )}
                        </div>

                        {/* Date */}
                        <div className="text-muted truncate">
                          {formatDDMMYYYY(inv.invoiceDate)}
                        </div>

                        {/* Due date */}
                        <div className="text-muted truncate">
                          {inv.dueDate ? formatDDMMYYYY(inv.dueDate) : 'Immediate'}
                        </div>

                        {/* Amount (right-aligned) */}
                        <div className="font-medium text-text tabular-nums text-right">
                          {formatCurrency(net)}
                        </div>

                        {/* Status badge */}
                        <div>
                          <StatusBadge status={inv.status} />
                        </div>

                        {/* Kebab menu */}
                        <div
                          className="flex justify-end"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu
                            ariaLabel={`Actions for invoice ${inv.invoiceNumber || 'draft'}`}
                            items={getMenuItems(inv)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 5e. Mobile Stacked Cards (< md) */}
              <div className="md:hidden divide-y divide-border">
                {invoices.map((inv) => {
                  const targetId = inv._id || inv.id;
                  const isDraft = inv.status === 'Draft';
                  const customerName = inv.customer?.name || inv.customerName || 'Walk-in Customer';
                  const net = Number(inv.netTotal ?? inv.grandTotal) || 0;
                  const handleCardClick = () =>
                    onNavigate(isDraft ? 'edit-invoice' : 'invoice-details', targetId, {
                      state: { from: location.pathname + location.search }
                    });

                  return (
                    <div
                      key={targetId}
                      role="button"
                      tabIndex={0}
                      onClick={handleCardClick}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleCardClick(); }}
                      className="p-4 space-y-1.5 hover:bg-surface/50 transition-colors cursor-pointer focus:outline-none focus:bg-surface/50"
                    >
                      {/* Top: Invoice no. + Amount + Kebab */}
                      <div className="flex items-center justify-between gap-2">
                        <Link
                          to={isDraft ? PATHS.APP.invoiceEdit(targetId) : PATHS.APP.invoice(targetId)}
                          state={{ from: location.pathname + location.search }}
                          onClick={(e) => e.stopPropagation()}
                          className="font-semibold text-text text-sm truncate hover:underline hover:text-accent"
                        >
                          {inv.invoiceNumber || 'INV-DRAFT'}
                        </Link>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-semibold text-text tabular-nums">
                            {formatCurrency(net)}
                          </span>
                          <div onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu
                              ariaLabel={`Actions for invoice ${inv.invoiceNumber || 'draft'}`}
                              items={getMenuItems(inv)}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Customer name */}
                      <div className="text-xs text-muted truncate">{customerName}</div>

                      {/* Dates + Status */}
                      <div className="flex items-center justify-between gap-2 text-xs text-muted">
                        <span>
                          {formatDDMMYYYY(inv.invoiceDate)}
                          {inv.dueDate ? ` · Due ${formatDDMMYYYY(inv.dueDate)}` : ''}
                        </span>
                        <StatusBadge status={inv.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ── 6. Pagination footer (only when total > limit) ──────────────── */}
        {!loading && total > limit && (
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={handleLimitChange}
            resourceName="invoices"
            loading={isFetching}
            className="border-t border-border -mx-4 sm:-mx-6 px-4 sm:px-6"
          />
        )}

      </div>

      {/* ── Cancel Invoice Confirm Dialog ───────────────────────────────────── */}
      <ConfirmDialog
        isOpen={!!cancelTarget}
        title={`Cancel ${cancelTarget?.invoiceNumber || 'invoice'}?`}
        description="This invoice will be marked as cancelled. This cannot be undone."
        confirmLabel="Cancel invoice"
        cancelLabel="Keep invoice"
        destructive
        loading={cancelling}
        error={cancelError}
        onConfirm={handleCancelConfirm}
        onCancel={() => {
          if (!cancelling) {
            setCancelTarget(null);
            setCancelError('');
          }
        }}
      />
    </div>
  );
}

export default Invoices;
