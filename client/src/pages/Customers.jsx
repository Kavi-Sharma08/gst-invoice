/**
 * Customers.jsx — Customer Directory Page
 *
 * Requirements:
 *  - No outer bordered/rounded box or overflow-hidden wrapper; sits directly on the page.
 *  - Header row and data rows share the exact same grid template constant (CUSTOMERS_GRID_CLASS).
 *  - Last column (48px) holds only the kebab button, right-aligned. Header cell has an sr-only label.
 *  - Contact column removed: phone/email shown as a muted line under customer name.
 *  - Narrow screens (< md): stacked rows with zero horizontal scroll, no overflow-x-auto.
 *  - Footer rendered only when total > limit; sticky bottom-0 bg-bg border-t.
 *  - Horizontal padding matches table rows (px-4).
 *  - Rows-per-page selector (10, 25, 50) stored in URL (?limit=25).
 *  - GSTIN green shield removed.
 *  - Warning icon shown when GSTIN state code differs from saved state.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Users,
  Edit3,
  Trash2,
  Eye,
  X,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';

import { Button } from '../components/invoice/InvoiceEditorUI';
import { CustomerDrawer } from '../components/customer/CustomerDrawer';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { DropdownMenu } from '../components/ui/DropdownMenu';
import { Pagination } from '../components/ui/Pagination';
import { PageHeader } from '../components/layout/PageHeader';

import { useAuth } from '../context/AuthContext';
import { customersApi } from '../api/customers.api';
import { invoicesApi } from '../api/invoices.api';
import { useDebounce } from '../utils/useDebounce';
import { useAppNavigate } from '../utils/navigation';
import { getCustomerTypeLabel } from '../utils/customer';
import { getStateByCode } from '../gst/taxRules';

// Exact unified grid template for desktop header and rows: 48px actions column right-aligned
const CUSTOMERS_GRID_CLASS = 'grid grid-cols-[minmax(0,2.5fr)_minmax(0,1.2fr)_minmax(0,1fr)_48px] gap-4 px-4 items-center';

// Helper to check if GSTIN state code differs from customer state
function checkStateMismatch(c) {
  if (!c?.gstin || c.gstin.length < 2 || !c.state) return false;
  const code = c.gstin.slice(0, 2);
  const mapped = getStateByCode(code);
  if (!mapped) return false;
  return mapped.name.trim().toLowerCase() !== c.state.trim().toLowerCase();
}

export function Customers({ onNavigate: propOnNavigate }) {
  const { isAuthenticated } = useAuth();
  const appNavigate = useAppNavigate();
  const onNavigate = propOnNavigate || appNavigate;

  const [searchParams, setSearchParams] = useSearchParams();

  // Read initial page, limit and q from URL query params
  const paramPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const parsedLimit = parseInt(searchParams.get('limit') || '10', 10) || 10;
  const paramLimit = [10, 25, 50].includes(parsedLimit) ? parsedLimit : 10;
  const paramQ = searchParams.get('q') || '';

  const [page, setPage] = useState(paramPage);
  const [limit, setLimit] = useState(paramLimit);
  const [search, setSearch] = useState(paramQ);
  const debouncedSearch = useDebounce(search, 300);

  // Customers data & pagination state
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState(null);

  // Cached invoices index for delete dialog check
  const [invoices, setInvoices] = useState([]);

  // Drawer & Dialog states
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const listTopRef = useRef(null);

  // Sync state with URL params on browser back / forward
  useEffect(() => {
    const p = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const l = parseInt(searchParams.get('limit') || '10', 10) || 10;
    const q = searchParams.get('q') || '';
    setPage((curr) => (curr !== p ? p : curr));
    setLimit((curr) => ([10, 25, 50].includes(l) && curr !== l ? l : curr));
    setSearch((curr) => (curr !== q ? q : curr));
  }, [searchParams]);

  // Update URL search parameters cleanly
  const updateUrl = useCallback((newPage, newQuery, newLimit = limit) => {
    const nextParams = new URLSearchParams();
    if (newPage > 1) nextParams.set('page', String(newPage));
    if (newLimit !== 10) nextParams.set('limit', String(newLimit));
    if (newQuery && newQuery.trim()) nextParams.set('q', newQuery.trim());
    setSearchParams(nextParams, { replace: true });
  }, [limit, setSearchParams]);

  // When debounced search query changes, reset to page 1
  const prevDebouncedSearchRef = useRef(debouncedSearch);
  useEffect(() => {
    if (prevDebouncedSearchRef.current !== debouncedSearch) {
      prevDebouncedSearchRef.current = debouncedSearch;
      setPage(1);
      updateUrl(1, debouncedSearch, limit);
    }
  }, [debouncedSearch, limit, updateUrl]);

  // Prefetch next page in background when applicable
  const prefetchNextPage = useCallback(async (nextPage, query, pageLimit) => {
    try {
      await customersApi.list({ page: nextPage, limit: pageLimit, search: query });
    } catch {
      // Ignore background prefetch errors
    }
  }, []);

  // Fetch customers with keepPreviousData
  const loadCustomersData = useCallback(async () => {
    try {
      setError(null);
      setIsFetching(true);

      const [cRes, iRes] = await Promise.all([
        customersApi.list({ page, limit, search: debouncedSearch }),
        invoicesApi.list({ limit: 500, expand: true }),
      ]);

      const data = cRes?.data || {};
      const custList = Array.isArray(data) ? data : (data.customers || []);
      const totalCount = typeof data.total === 'number' ? data.total : custList.length;
      const invList = Array.isArray(iRes?.data) ? iRes.data : (iRes?.data?.invoices || []);

      setCustomers(custList);
      setTotal(totalCount);
      setInvoices(invList);

      const totalPages = Math.ceil(totalCount / limit);
      if (page < totalPages) {
        prefetchNextPage(page + 1, debouncedSearch, limit);
      }
    } catch (err) {
      console.error('Failed to load customers:', err);
      setError(err.message || 'Failed to load customers. Please check your connection.');
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  }, [page, limit, debouncedSearch, prefetchNextPage]);

  useEffect(() => {
    loadCustomersData();
  }, [loadCustomersData, isAuthenticated]);

  // Auto-fallback: if current page is empty after deletion and page > 1, go to page - 1
  useEffect(() => {
    if (!loading && !isFetching && customers.length === 0 && total > 0 && page > 1) {
      const prevPage = page - 1;
      setPage(prevPage);
      updateUrl(prevPage, debouncedSearch, limit);
    }
  }, [customers.length, total, page, loading, isFetching, debouncedSearch, limit, updateUrl]);

  const handlePageChange = (newPage) => {
    setPage(newPage);
    updateUrl(newPage, debouncedSearch, limit);
    listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit);
    setPage(1);
    updateUrl(1, debouncedSearch, newLimit);
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
  };

  const handleClearSearch = () => {
    setSearch('');
    setPage(1);
    updateUrl(1, '', limit);
  };

  const getCustomerInvoiceCount = useCallback((c) => {
    if (!c) return 0;
    const cId = String(c._id || c.id || '');
    const cName = (c.name || '').trim().toLowerCase();
    return invoices.filter((inv) => {
      const invCustId = String(inv.customerId || inv.customer?.id || inv.customer?._id || '');
      if (cId && invCustId === cId) return true;
      if (cName && (inv.customer?.name || '').trim().toLowerCase() === cName) return true;
      return false;
    }).length;
  }, [invoices]);

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setDrawerOpen(true);
  };

  const handleOpenEdit = (customer) => {
    setEditingCustomer(customer);
    setDrawerOpen(true);
  };

  const handleSaveCustomer = async (formData) => {
    const targetId = editingCustomer?._id || editingCustomer?.id;
    if (editingCustomer) {
      await customersApi.update(targetId, formData);
    } else {
      await customersApi.create(formData);
    }
    setDrawerOpen(false);
    loadCustomersData();
  };

  const handleInitiateDelete = (customer) => {
    const count = getCustomerInvoiceCount(customer);
    setDeleteTarget({ customer, invoiceCount: count });
    setDeleteError('');
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget?.customer) return;
    const targetId = deleteTarget.customer._id || deleteTarget.customer.id;
    try {
      setDeleting(true);
      setDeleteError('');
      await customersApi.delete(targetId);
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      loadCustomersData();
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete customer.');
    } finally {
      setDeleting(false);
    }
  };

  const isSearchEmpty = !loading && customers.length === 0 && Boolean(debouncedSearch);
  const isEntirelyEmpty = !loading && total === 0 && !debouncedSearch;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const getCustomerMenuItems = (c) => {
    const targetId = c._id || c.id;
    return [
      {
        label: 'View details',
        icon: Eye,
        onSelect: () => onNavigate('customer-details', targetId),
      },
      {
        label: 'Edit',
        icon: Edit3,
        onSelect: () => handleOpenEdit(c),
      },
      {
        label: 'New invoice',
        icon: Plus,
        onSelect: () => onNavigate('create-invoice', null, { state: { customerId: targetId, customer: c } }),
      },
      // Archive is hidden because the backend lacks archive support
      {
        label: 'Delete',
        icon: Trash2,
        danger: true,
        dividerBefore: true,
        onSelect: () => handleInitiateDelete(c),
      },
    ];
  };

  return (
    <div className="flex flex-col min-h-full w-full bg-bg text-text font-sans">
      <div className="mx-auto w-full max-w-screen-xl px-4 sm:px-6 py-6 flex-1 flex flex-col space-y-6">

        {/* ── Page Header ────────────────────────────────────────────────── */}
        <PageHeader
          title="Customers"
          count={total}
          hideTitleOnMobile
          actions={
            !isEntirelyEmpty && (
              <Button
                variant="primary"
                size="md"
                aria-label="Add customer"
                title="Add customer"
                onClick={handleOpenAdd}
                className="shrink-0 h-10 w-10 sm:w-auto p-0 sm:px-4 flex items-center justify-center rounded-lg"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Add customer</span>
              </Button>
            )
          }
        />

        {/* ── Error Banner ────────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-center justify-between rounded-lg border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm gap-3">
            <div className="flex items-center gap-2 text-danger min-w-0">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="truncate">{error}</span>
            </div>
            <Button variant="secondary" size="sm" onClick={loadCustomersData} className="shrink-0">
              Retry
            </Button>
          </div>
        )}

        {/* ── Search Bar ──────────────────────────────────────────────────── */}
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name or GSTIN…"
            value={search}
            onChange={handleSearchChange}
            className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-8 text-sm font-normal text-text placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
          />
          {search && (
            <button
              type="button"
              onClick={handleClearSearch}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-text cursor-pointer p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* ── Direct-on-Page List Area (grows via flex-1) ─────────────────── */}
        <div ref={listTopRef} className="w-full flex-1">
          {loading ? (
            /* First Load: 5 Skeleton Rows */
            <div className="divide-y divide-border">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={`${CUSTOMERS_GRID_CLASS} h-14 animate-pulse`}>
                  <div className="space-y-1.5 min-w-0 pr-2">
                    <div className="h-3.5 bg-border rounded w-36" />
                    <div className="h-2.5 bg-border rounded w-24" />
                  </div>
                  <div className="hidden md:block h-3.5 bg-border rounded w-28" />
                  <div className="hidden md:block h-5 bg-border rounded w-20" />
                  <div className="flex justify-end">
                    <div className="h-8 w-8 bg-border rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : isSearchEmpty ? (
            /* Search with No Results */
            <div className="min-h-[240px] flex flex-col items-center justify-center p-6 text-center">
              <div className="w-10 h-10 rounded-lg bg-surface border border-border flex items-center justify-center text-muted mb-3">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-text">No matching customers</h3>
              <p className="text-xs text-muted mt-1 max-w-sm">
                No customer records matched &ldquo;{debouncedSearch}&rdquo;. Try another name or GSTIN.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleClearSearch}
                className="mt-4"
              >
                Clear search
              </Button>
            </div>
          ) : isEntirelyEmpty ? (
            /* Entirely Empty Directory */
            <div className="min-h-[240px] flex flex-col items-center justify-center p-6 text-center">
              <div className="w-10 h-10 rounded-lg bg-surface border border-border flex items-center justify-center text-muted mb-3">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-text">Your customer directory is empty</h3>
              <p className="text-xs text-muted mt-1 max-w-sm">
                Add customers with their GSTIN and billing details to generate invoices faster.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenAdd}
                className="mt-4"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Customer
              </Button>
            </div>
          ) : (
            <div className={isFetching ? 'opacity-60 pointer-events-none transition-opacity duration-150' : 'transition-opacity duration-150'}>
              {/* Desktop Table View (≥ md) — Unified Grid Template */}
              <div className="hidden md:block w-full">
                {/* Header Row */}
                <div
                  className={`${CUSTOMERS_GRID_CLASS} py-3 border-b border-border text-[12px] font-medium text-muted uppercase tracking-wider select-none`}
                >
                  <div>Customer</div>
                  <div>GSTIN</div>
                  <div>State</div>
                  <div className="flex justify-end">
                    <span className="sr-only">Actions</span>
                  </div>
                </div>

                {/* Data Rows */}
                <div className="divide-y divide-border">
                  {customers.map((c) => {
                    const targetId = c._id || c.id;
                    const isMismatch = checkStateMismatch(c);

                    return (
                      <div
                        key={targetId}
                        tabIndex={0}
                        role="link"
                        onClick={() => onNavigate('customer-details', targetId)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') onNavigate('customer-details', targetId);
                        }}
                        className={`${CUSTOMERS_GRID_CLASS} h-14 hover:bg-surface/50 transition-colors cursor-pointer group focus:outline-none focus:bg-surface/50`}
                      >
                        {/* 1. Customer: Name + Address + Phone/Email second line */}
                        <div className="min-w-0 pr-2">
                          <div className="text-sm font-medium text-text truncate">
                            {c.name}
                          </div>
                          <div
                            className="text-xs text-muted truncate mt-0.5"
                            title={c.address || undefined}
                          >
                            {c.address ? (
                              <span>
                                {c.address}
                                {(c.email || c.phone) && (
                                  <span className="text-faint">
                                    {' '}· {c.email || `+91 ${c.phone}`}
                                  </span>
                                )}
                              </span>
                            ) : c.email || c.phone ? (
                              <span>{c.email || `+91 ${c.phone}`}</span>
                            ) : (
                              <span className="text-faint">—</span>
                            )}
                          </div>
                        </div>

                        {/* 2. GSTIN (neutral, no green shield) */}
                        <div className="truncate text-xs text-text font-normal">
                          {c.gstin ? (
                            <span>{c.gstin}</span>
                          ) : (
                            <span className="text-faint">
                              {getCustomerTypeLabel(c.customerType)}
                            </span>
                          )}
                        </div>

                        {/* 3. State with mismatch check */}
                        <div className="flex items-center gap-1.5 min-w-0">
                          {c.state ? (
                            <span className="text-xs font-medium text-muted px-2 py-0.5 rounded-md bg-border border border-border truncate">
                              {c.state}
                            </span>
                          ) : (
                            <span className="text-faint text-xs">—</span>
                          )}
                          {isMismatch && (
                            <AlertTriangle
                              className="w-3.5 h-3.5 text-warning shrink-0 cursor-help"
                              title="State differs from GSTIN state code"
                              aria-label="State differs from GSTIN state code"
                            />
                          )}
                        </div>

                        {/* 4. Actions: 48px column right-aligned */}
                        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu
                            ariaLabel={`Actions for ${c.name}`}
                            items={getCustomerMenuItems(c)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Narrow Screens (< md): Stacked rows without horizontal scroll */}
              <div className="md:hidden divide-y divide-border">
                {customers.map((c) => {
                  const targetId = c._id || c.id;
                  const isMismatch = checkStateMismatch(c);

                  return (
                    <div
                      key={targetId}
                      tabIndex={0}
                      role="link"
                      onClick={() => onNavigate('customer-details', targetId)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') onNavigate('customer-details', targetId);
                      }}
                      className="py-3 px-4 space-y-2 hover:bg-surface/50 transition-colors cursor-pointer focus:outline-none focus:bg-surface/50"
                    >
                      {/* Stack Item 1: Name, Address & Contact, Kebab Menu */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-text truncate">
                            {c.name}
                          </div>
                          <div
                            className="text-xs text-muted truncate mt-0.5"
                            title={c.address}
                          >
                            {c.address || (c.email ? `${c.email}${c.phone ? ` · +91 ${c.phone}` : ''}` : '—')}
                          </div>
                        </div>
                        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu
                            ariaLabel={`Actions for ${c.name}`}
                            items={getCustomerMenuItems(c)}
                          />
                        </div>
                      </div>

                      {/* Stack Item 2: GSTIN and State */}
                      <div className="flex items-center gap-2 flex-wrap text-xs pt-1 border-t border-border/50">
                        <span className={c.gstin ? 'text-text' : 'text-faint'}>
                          {c.gstin || getCustomerTypeLabel(c.customerType)}
                        </span>
                        {c.state && (
                          <>
                            <span className="text-faint">·</span>
                            <span className="text-muted">{c.state}</span>
                            {isMismatch && (
                              <AlertTriangle
                                className="w-3.5 h-3.5 text-warning shrink-0 cursor-help"
                                title="State differs from GSTIN state code"
                                aria-label="State differs from GSTIN state code"
                              />
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Sticky Pagination Footer (stays visible on scroll, naturally follows shorter lists) ── */}
        <div className="sticky bottom-0 bg-bg z-10">
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
            resourceName="customers"
            loading={isFetching}
          />
        </div>

      </div>

      {/* ── Customer Drawer ────────────────────────────────────────────────── */}
      <CustomerDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSave={handleSaveCustomer}
        initialData={editingCustomer}
      />

      {/* ── In-App Delete Confirmation Dialog ──────────────────────────────── */}
      {deleteTarget && (
        <ConfirmDialog
          isOpen={deleteDialogOpen}
          title={
            deleteTarget.invoiceCount > 0
              ? `Can't delete ${deleteTarget.customer.name}`
              : `Delete ${deleteTarget.customer.name}?`
          }
          description={
            deleteTarget.invoiceCount > 0
              ? `This customer has ${deleteTarget.invoiceCount} ${
                  deleteTarget.invoiceCount === 1 ? 'invoice' : 'invoices'
                }. Invoices are tax records and must be kept. You can archive the customer instead.`
              : "This customer will be permanently removed. This can't be undone."
          }
          confirmLabel={deleteTarget.invoiceCount > 0 ? null : 'Delete customer'}
          cancelLabel={deleteTarget.invoiceCount > 0 ? 'Close' : 'Cancel'}
          destructive={deleteTarget.invoiceCount === 0}
          loading={deleting}
          error={deleteError}
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            if (!deleting) {
              setDeleteDialogOpen(false);
              setDeleteTarget(null);
            }
          }}
        />
      )}
    </div>
  );
}

export default Customers;
