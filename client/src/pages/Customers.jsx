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
 *  - Active / Archived segmented filter stored in URL (?archived=true|false).
 *  - TanStack Query with keepPreviousData, enabled on isLoaded && isSignedIn.
 *  - Delete dialog uses server invoiceCount; offers Archive if customer has invoices.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData
} from '@tanstack/react-query';
import {
  Plus,
  Search,
  Users,
  Edit3,
  Trash2,
  Eye,
  X,
  AlertTriangle,
  AlertCircle,
  Archive,
  ArchiveRestore
} from 'lucide-react';

import { Button } from '../components/invoice/InvoiceEditorUI';
import { CustomerDrawer } from '../components/customer/CustomerDrawer';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { DropdownMenu } from '../components/ui/DropdownMenu';
import { Pagination } from '../components/ui/Pagination';
import { PageHeader } from '../components/layout/PageHeader';

import { useAuth } from '@/features/auth';
import { customersApi, customerQueryKeys } from '../api/customers.api';
import { useDebounce } from '../utils/useDebounce';
import { useAppNavigate } from '../utils/navigation';
import { getCustomerTypeLabel } from '../utils/customer';
import { getStateByCode } from '../gst/taxRules';

// Exact unified grid template for desktop header and rows: 48px actions column right-aligned
const CUSTOMERS_GRID_CLASS =
  'grid grid-cols-[minmax(0,2.5fr)_minmax(0,1.2fr)_minmax(0,1fr)_48px] gap-4 px-4 items-center';

// Helper to check if GSTIN state code differs from customer state
function checkStateMismatch(c) {
  if (!c?.gstin || c.gstin.length < 2 || !c.state) return false;
  const code = c.gstin.slice(0, 2);
  const mapped = getStateByCode(code);
  if (!mapped) return false;
  return mapped.name.trim().toLowerCase() !== c.state.trim().toLowerCase();
}

export function Customers({ onNavigate: propOnNavigate }) {
  const { isLoaded, isSignedIn } = useAuth();
  const isAuthReady = Boolean(isLoaded && isSignedIn);
  const queryClient = useQueryClient();
  const appNavigate = useAppNavigate();
  const onNavigate = propOnNavigate || appNavigate;

  const [searchParams, setSearchParams] = useSearchParams();

  // Read initial params from URL
  const paramPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const parsedLimit = parseInt(searchParams.get('limit') || '10', 10) || 10;
  const paramLimit = [10, 25, 50].includes(parsedLimit) ? parsedLimit : 10;
  const paramQ = searchParams.get('q') || '';
  const paramArchived = searchParams.get('archived') === 'true';

  const [page, setPage] = useState(paramPage);
  const [limit, setLimit] = useState(paramLimit);
  const [search, setSearch] = useState(paramQ);
  const [isArchivedTab, setIsArchivedTab] = useState(paramArchived);
  const debouncedSearch = useDebounce(search, 300);

  // Drawer & Dialog states
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const listTopRef = useRef(null);

  // Sync state with URL params on browser back / forward
  useEffect(() => {
    const p = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const l = parseInt(searchParams.get('limit') || '10', 10) || 10;
    const q = searchParams.get('q') || '';
    const arc = searchParams.get('archived') === 'true';
    setPage((curr) => (curr !== p ? p : curr));
    setLimit((curr) => ([10, 25, 50].includes(l) && curr !== l ? l : curr));
    setSearch((curr) => (curr !== q ? q : curr));
    setIsArchivedTab((curr) => (curr !== arc ? arc : curr));
  }, [searchParams]);

  // Update URL search parameters cleanly
  const updateUrl = useCallback(
    (newPage, newQuery, newLimit = limit, newArchived = isArchivedTab) => {
      const nextParams = new URLSearchParams();
      if (newPage > 1) nextParams.set('page', String(newPage));
      if (newLimit !== 10) nextParams.set('limit', String(newLimit));
      if (newQuery && newQuery.trim()) nextParams.set('q', newQuery.trim());
      if (newArchived) nextParams.set('archived', 'true');
      setSearchParams(nextParams, { replace: true });
    },
    [limit, isArchivedTab, setSearchParams]
  );

  // When debounced search query or archived tab changes, reset to page 1
  const prevSearchRef = useRef(debouncedSearch);
  const prevArchivedRef = useRef(isArchivedTab);
  useEffect(() => {
    if (prevSearchRef.current !== debouncedSearch || prevArchivedRef.current !== isArchivedTab) {
      prevSearchRef.current = debouncedSearch;
      prevArchivedRef.current = isArchivedTab;
      setPage(1);
      updateUrl(1, debouncedSearch, limit, isArchivedTab);
    }
  }, [debouncedSearch, isArchivedTab, limit, updateUrl]);

  // Query: Paginated customers list (with keepPreviousData)
  const queryParams = useMemo(
    () => ({
      page,
      limit,
      q: (search === '' ? '' : debouncedSearch) || undefined,
      archived: isArchivedTab ? 'true' : 'false'
    }),
    [page, limit, search, debouncedSearch, isArchivedTab]
  );

  const {
    data: listResponse,
    isLoading: loading,
    isFetching,
    error: queryError,
    refetch: loadCustomersData
  } = useQuery({
    queryKey: customerQueryKeys.list(queryParams),
    queryFn: () => customersApi.list(queryParams),
    placeholderData: keepPreviousData,
    enabled: isAuthReady
  });

  const customers = useMemo(() => {
    const raw = listResponse?.data;
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.customers)) return raw.customers;
    return [];
  }, [listResponse]);

  const total = useMemo(() => {
    return listResponse?.meta?.total ?? listResponse?.data?.total ?? customers.length;
  }, [listResponse, customers.length]);

  // Auto-fallback: if current page is empty after deletion and page > 1, go to page - 1
  useEffect(() => {
    if (!loading && !isFetching && customers.length === 0 && total > 0 && page > 1) {
      const prevPage = page - 1;
      setPage(prevPage);
      updateUrl(prevPage, debouncedSearch, limit, isArchivedTab);
    }
  }, [customers.length, total, page, loading, isFetching, debouncedSearch, limit, isArchivedTab, updateUrl]);

  // Mutations
  const archiveMutation = useMutation({
    mutationFn: (id) => customersApi.archive(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: customerQueryKeys.all });
    },
    onError: (err) => {
      alert(err.message || 'Failed to archive customer.');
    }
  });

  const unarchiveMutation = useMutation({
    mutationFn: (id) => customersApi.unarchive(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: customerQueryKeys.all });
    },
    onError: (err) => {
      alert(err.message || 'Failed to unarchive customer.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => customersApi.delete(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: customerQueryKeys.all });
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    },
    onError: (err) => {
      if (err.code === 'CUSTOMER_HAS_INVOICES') {
        const count = err.details?.invoiceCount || 1;
        setDeleteTarget((prev) => (prev ? { ...prev, invoiceCount: count } : null));
      }
      setDeleteError(err.message || 'Failed to delete customer.');
    }
  });

  const handlePageChange = (newPage) => {
    setPage(newPage);
    updateUrl(newPage, debouncedSearch, limit, isArchivedTab);
    listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit);
    setPage(1);
    updateUrl(1, debouncedSearch, newLimit, isArchivedTab);
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
  };

  const handleClearSearch = () => {
    setSearch('');
    setPage(1);
    updateUrl(1, '', limit, isArchivedTab);
  };

  const handleArchivedChange = (newArchived) => {
    setIsArchivedTab(newArchived);
    setPage(1);
    updateUrl(1, debouncedSearch, limit, newArchived);
  };

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
    let res;
    if (editingCustomer) {
      res = await customersApi.update(targetId, formData);
    } else {
      res = await customersApi.create(formData);
      // Reset to page 1, clear search, and show Active tab so newly created customer is visible
      setPage(1);
      setSearch('');
      setIsArchivedTab(false);
      updateUrl(1, '', limit, false);
    }
    await queryClient.invalidateQueries({ queryKey: customerQueryKeys.all });
    setDrawerOpen(false);
    return res;
  };

  const handleInitiateDelete = (customer) => {
    const count = customer.invoiceCount ?? 0;
    setDeleteTarget({ customer, invoiceCount: count });
    setDeleteError('');
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget?.customer) return;
    const targetId = deleteTarget.customer._id || deleteTarget.customer.id;
    setDeleteError('');
    deleteMutation.mutate(targetId);
  };

  const handleArchiveFromDialog = () => {
    if (!deleteTarget?.customer) return;
    const targetId = deleteTarget.customer._id || deleteTarget.customer.id;
    archiveMutation.mutate(targetId, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        setDeleteTarget(null);
      }
    });
  };

  const isSearchEmpty = !loading && !queryError && customers.length === 0 && Boolean(debouncedSearch);
  const isEntirelyEmpty = !loading && !queryError && total === 0 && !debouncedSearch;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const getCustomerMenuItems = (c) => {
    const targetId = c._id || c.id;
    return [
      {
        label: 'View details',
        icon: Eye,
        onSelect: () => onNavigate('customer-details', targetId)
      },
      {
        label: 'Edit',
        icon: Edit3,
        onSelect: () => handleOpenEdit(c)
      },
      ...(!c.isArchived
        ? [
            {
              label: 'New invoice',
              icon: Plus,
              onSelect: () =>
                onNavigate('create-invoice', null, { state: { customerId: targetId, customer: c } })
            },
            {
              label: 'Archive',
              icon: Archive,
              onSelect: () => archiveMutation.mutate(targetId)
            }
          ]
        : [
            {
              label: 'Unarchive',
              icon: ArchiveRestore,
              onSelect: () => unarchiveMutation.mutate(targetId)
            }
          ]),
      {
        label: 'Delete',
        icon: Trash2,
        danger: true,
        dividerBefore: true,
        onSelect: () => handleInitiateDelete(c)
      }
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
        {queryError && (
          <div className="flex items-center justify-between rounded-lg border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm gap-3">
            <div className="flex items-center gap-2 text-danger min-w-0">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="truncate">{queryError.message || 'Failed to load customers.'}</span>
            </div>
            <Button variant="secondary" size="sm" onClick={() => loadCustomersData()} className="shrink-0">
              Retry
            </Button>
          </div>
        )}

        {/* ── Search Bar & Active/Archived Filter ─────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, GSTIN or state…"
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

          {/* Active / Archived Segmented Control */}
          <div className="flex items-center h-10 rounded-lg border border-border bg-surface p-1 text-xs shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => handleArchivedChange(false)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                !isArchivedTab ? 'bg-accent text-text shadow-sm' : 'text-muted hover:text-text'
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => handleArchivedChange(true)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                isArchivedTab ? 'bg-accent text-text shadow-sm' : 'text-muted hover:text-text'
              }`}
            >
              Archived
            </button>
          </div>
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
          ) : queryError ? (
            /* Error state with retry */
            <div className="min-h-[240px] flex flex-col items-center justify-center p-6 text-center">
              <div className="w-10 h-10 rounded-lg bg-surface border border-danger/30 flex items-center justify-center text-danger mb-3">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-text">Failed to load customers</h3>
              <p className="text-xs text-muted mt-1 max-w-sm">
                {queryError.message || 'Unable to load customers. Please check your connection.'}
              </p>
              <Button variant="secondary" size="sm" onClick={loadCustomersData} className="mt-4">
                Retry
              </Button>
            </div>
          ) : isSearchEmpty ? (
            /* Search with No Results */
            <div className="min-h-[240px] flex flex-col items-center justify-center p-6 text-center">
              <div className="w-10 h-10 rounded-lg bg-surface border border-border flex items-center justify-center text-muted mb-3">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-text">No matching customers</h3>
              <p className="text-xs text-muted mt-1 max-w-sm">
                No customer records matched &ldquo;{debouncedSearch}&rdquo;. Try another name, GSTIN, or state.
              </p>
              <Button variant="secondary" size="sm" onClick={handleClearSearch} className="mt-4">
                Clear search
              </Button>
            </div>
          ) : isEntirelyEmpty ? (
            /* Entirely Empty Directory */
            <div className="min-h-[240px] flex flex-col items-center justify-center p-6 text-center">
              <div className="w-10 h-10 rounded-lg bg-surface border border-border flex items-center justify-center text-muted mb-3">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-text">
                {isArchivedTab ? 'No archived customers' : 'Your customer directory is empty'}
              </h3>
              <p className="text-xs text-muted mt-1 max-w-sm">
                {isArchivedTab
                  ? 'Customers you archive will appear here so you can review or unarchive them.'
                  : 'Add customers with their GSTIN and billing details to generate invoices faster.'}
              </p>
              {!isArchivedTab && (
                <Button variant="primary" size="sm" onClick={handleOpenAdd} className="mt-4">
                  <Plus className="w-3.5 h-3.5" />
                  Add Customer
                </Button>
              )}
            </div>
          ) : (
            <div
              className={
                isFetching ? 'opacity-60 pointer-events-none transition-opacity duration-150' : 'transition-opacity duration-150'
              }
            >
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
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-text truncate">{c.name}</span>
                            {c.isArchived && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
                                Archived
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted truncate mt-0.5" title={c.address || undefined}>
                            {c.address ? (
                              <span>
                                {c.address}
                                {(c.email || c.phone) && (
                                  <span className="text-faint">
                                    {' '}
                                    · {c.email || `+91 ${c.phone}`}
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
                            <span className="text-faint">{getCustomerTypeLabel(c.customerType)}</span>
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
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-text truncate">{c.name}</span>
                            {c.isArchived && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
                                Archived
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted truncate mt-0.5" title={c.address}>
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

        {/* ── Sticky Pagination Footer ────────────────────────────────────── */}
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
          confirmLabel={
            deleteTarget.invoiceCount > 0
              ? deleteTarget.customer.isArchived
                ? null
                : 'Archive customer'
              : 'Delete customer'
          }
          cancelLabel={deleteTarget.invoiceCount > 0 ? 'Close' : 'Cancel'}
          destructive={deleteTarget.invoiceCount === 0}
          loading={deleteMutation.isPending || archiveMutation.isPending}
          error={deleteError}
          onConfirm={() => {
            if (deleteTarget.invoiceCount > 0) {
              handleArchiveFromDialog();
            } else {
              handleConfirmDelete();
            }
          }}
          onCancel={() => {
            if (!deleteMutation.isPending && !archiveMutation.isPending) {
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
