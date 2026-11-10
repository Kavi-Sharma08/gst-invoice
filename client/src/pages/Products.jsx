/**
 * Products.jsx — Products & Services Catalog Page
 *
 * Design System:
 *  - Colors: strictly semantic tokens (bg, surface, border, text, muted, faint, accent, danger)
 *  - Layout: matches Customers/Invoices pages (max-w-screen-xl px-4 sm:px-6 py-6)
 *  - Header: "Products & services" (20px/600) + muted count + subtitle + "Add item" button (icon-only below sm)
 *  - Type filter: underline-style tabs (All, Services, Goods) with muted counts
 *  - Grid: unified constant for header + data rows, px-4 gap-4, h-14, 1px dividers, hover surface
 *  - Pagination: shared Pagination footer, sticky bottom-0 with border-t, rows-per-page (10, 25, 50), URL sync
 *  - States: 5 skeleton rows, inline error + Retry, empty catalog, no matches
 *
 * NOTE ON SERVER ENDPOINT:
 * The server's listProducts endpoint (`server/src/modules/products/products.service.js`) supports
 * `page`, `limit`, and `search`, but does not yet accept a `type` query parameter.
 * To ensure accurate tab counts and complete pagination across services and goods, items matching
 * the search query are loaded and paginated client-side. The endpoint needs `type` added to its query filter.
 */

import React, {
  useState, useEffect, useMemo, useCallback,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus, Search, Package, Edit3, Copy, Trash2,
  X, AlertCircle,
} from 'lucide-react';

import { useAuth } from '@/features/auth';
import { productsApi } from '../api/products.api';
import { formatCurrency } from '../utils/currency';
import { useDebounce } from '../utils/useDebounce';
import { Button } from '../components/invoice/InvoiceEditorUI';
import { DropdownMenu } from '../components/ui/DropdownMenu';
import { Pagination } from '../components/ui/Pagination';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ProductDrawer } from '../components/product/ProductDrawer';
import { PageHeader } from '../components/layout/PageHeader';

// ── Unified grid template: Name | Type | HSN/SAC | Rate | GST | Unit | actions ─
const PRODUCTS_GRID =
  'grid grid-cols-[minmax(0,2fr)_90px_110px_minmax(0,1fr)_80px_80px_48px] gap-4 px-4 items-center';

// ── Type filter tabs ──────────────────────────────────────────────────────────
const TYPE_TABS = [
  { id: 'ALL', label: 'All' },
  { id: 'Service', label: 'Services' },
  { id: 'Product', label: 'Goods' },
];

function normalizeTypeParam(val) {
  if (!val) return 'ALL';
  const lower = val.toLowerCase();
  if (lower === 'service' || lower === 'services') return 'Service';
  if (lower === 'goods' || lower === 'good' || lower === 'product' || lower === 'products') return 'Product';
  return 'ALL';
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Products Page Component
// ═══════════════════════════════════════════════════════════════════════════════

export function Products() {
  const { isAuthenticated } = useAuth();

  const [searchParams, setSearchParams] = useSearchParams();

  // Read initial state from URL
  const paramPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const parsedLimit = parseInt(searchParams.get('limit') || '10', 10) || 10;
  const paramLimit = [10, 25, 50].includes(parsedLimit) ? parsedLimit : 10;
  const paramQ = searchParams.get('q') || '';
  const paramType = normalizeTypeParam(searchParams.get('type'));

  const [page, setPage] = useState(paramPage);
  const [limit, setLimit] = useState(paramLimit);
  const [search, setSearch] = useState(paramQ);
  const [typeFilter, setTypeFilter] = useState(paramType);
  const debouncedSearch = useDebounce(search, 300);

  // Data state
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState(null);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isDuplicate, setIsDuplicate] = useState(false);

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // ── Sync URL when state changes ─────────────────────────────────────────
  useEffect(() => {
    const params = {};
    if (page > 1) params.page = String(page);
    if (limit !== 10) params.limit = String(limit);
    if (debouncedSearch) params.q = debouncedSearch;
    if (typeFilter === 'Service') params.type = 'service';
    else if (typeFilter === 'Product') params.type = 'goods';
    setSearchParams(params, { replace: true });
  }, [page, limit, debouncedSearch, typeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadProducts = useCallback(async () => {
    try {
      setIsFetching(true);
      setError(null);
      const params = { limit: 500 };
      if (debouncedSearch) params.search = debouncedSearch;

      const res = await productsApi.list(params);
      const data = res?.data;
      const list = Array.isArray(data) ? data : (data?.products || []);

      setAllProducts(list);
    } catch (err) {
      console.error('Failed to load products:', err);
      setError(err.message || 'Failed to load products. Please check your connection.');
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    setLoading(true);
    loadProducts();
  }, [loadProducts, isAuthenticated]);

  // ── Live tab counts (from all search-matched items) ─────────────────────
  const typeCounts = useMemo(() => {
    const counts = { ALL: allProducts.length, Service: 0, Product: 0 };
    allProducts.forEach((p) => {
      if (counts[p.type] !== undefined) counts[p.type]++;
    });
    return counts;
  }, [allProducts]);

  // ── Filtered items based on active tab ──────────────────────────────────
  const filteredProducts = useMemo(() => {
    if (typeFilter === 'ALL') return allProducts;
    return allProducts.filter((p) => p.type === typeFilter);
  }, [allProducts, typeFilter]);

  const total = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // ── Paginated slice for current page ────────────────────────────────────
  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredProducts.slice(start, start + limit);
  }, [filteredProducts, page, limit]);

  // ── State helpers ────────────────────────────────────────────────────────
  const handleTypeChange = (id) => {
    setTypeFilter(id);
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

  // ── Drawer handlers ──────────────────────────────────────────────────────
  const openAdd = () => {
    setEditingProduct(null);
    setIsDuplicate(false);
    setDrawerOpen(true);
  };

  const openEdit = (product) => {
    setEditingProduct(product);
    setIsDuplicate(false);
    setDrawerOpen(true);
  };

  const openDuplicate = (product) => {
    setEditingProduct(product);
    setIsDuplicate(true);
    setDrawerOpen(true);
  };

  const handleSave = async (formData) => {
    const targetId = editingProduct?._id || editingProduct?.id;
    if (editingProduct && !isDuplicate) {
      await productsApi.update(targetId, formData);
    } else {
      await productsApi.create(formData);
    }
    setDrawerOpen(false);
    loadProducts();
  };

  // ── Delete handlers ──────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget._id || deleteTarget.id;
    try {
      setDeleting(true);
      setDeleteError('');
      await productsApi.delete(targetId);
      setDeleteTarget(null);
      loadProducts();
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete item.');
    } finally {
      setDeleting(false);
    }
  };

  // ── Build kebab menu items per product ───────────────────────────────────
  const getMenuItems = (p) => [
    {
      label: 'Edit',
      icon: Edit3,
      onSelect: () => openEdit(p),
    },
    {
      label: 'Duplicate',
      icon: Copy,
      onSelect: () => openDuplicate(p),
    },
    {
      label: 'Delete',
      icon: Trash2,
      danger: true,
      dividerBefore: true,
      onSelect: () => {
        setDeleteError('');
        setDeleteTarget(p);
      },
    },
  ];

  const hasFilters = !!debouncedSearch || typeFilter !== 'ALL';
  const isEntirelyEmpty = !loading && allProducts.length === 0 && !hasFilters;
  const isNoMatch = !loading && filteredProducts.length === 0 && hasFilters;

  return (
    <div className="w-full bg-bg text-text font-sans flex flex-col min-h-full">
      <div className="mx-auto max-w-screen-xl w-full px-4 sm:px-6 py-6 space-y-6 pb-24 lg:pb-12 flex-1 flex flex-col">

        {/* ── 1. Page Header ───────────────────────────────────────────── */}
        <PageHeader
          title="Products & services"
          count={total !== undefined ? `${total} ${total === 1 ? 'item' : 'items'}` : undefined}
          hideTitleOnMobile
          actions={
            !isEntirelyEmpty && (
              <Button
                variant="primary"
                size="md"
                aria-label="Add item"
                onClick={openAdd}
                title="Add item"
                className="shrink-0 h-10 w-10 sm:w-auto p-0 sm:px-4 flex items-center justify-center rounded-lg"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Add item</span>
              </Button>
            )
          }
        />

        {/* ── 2. Error Notice ──────────────────────────────────────────── */}
        {error && (
          <div className="flex items-center justify-between rounded-lg border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm gap-3">
            <div className="flex items-center gap-2 text-danger min-w-0">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="truncate">Unable to load items. Please check your connection.</span>
            </div>
            <Button variant="secondary" size="sm" onClick={loadProducts} className="shrink-0">
              Retry
            </Button>
          </div>
        )}

        {/* ── 3. Filters: Type tabs + Search ───────────────────────────── */}
        {!isEntirelyEmpty && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Type tabs — underline style */}
            <div className="flex items-center gap-0 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {TYPE_TABS.map((tab) => {
                const active = typeFilter === tab.id;
                const count = typeCounts[tab.id] ?? 0;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTypeChange(tab.id)}
                    className={[
                      'flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 cursor-pointer transition-colors whitespace-nowrap shrink-0',
                      active
                        ? 'border-accent text-text font-semibold'
                        : 'border-transparent text-muted hover:text-text hover:border-border',
                    ].join(' ')}
                  >
                    <span>{tab.label}</span>
                    <span className={`text-[11px] tabular-nums font-normal ${active ? 'text-muted' : 'text-faint'}`}>
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
                placeholder="Search by name, HSN/SAC…"
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
        )}

        {/* ── 4. Product List ───────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {loading ? (
            /* 4a. Skeleton loading — 5 rows */
            <div className="divide-y divide-border">
              <div className={`${PRODUCTS_GRID} py-3 border-b border-border`}>
                {[160, 60, 80, 70, 50, 50, 28].map((w, i) => (
                  <div
                    key={i}
                    className="h-3 bg-border rounded animate-pulse"
                    style={{ width: w, maxWidth: '100%' }}
                  />
                ))}
              </div>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={`${PRODUCTS_GRID} h-14 animate-pulse`}>
                  <div className="space-y-1.5">
                    <div className="h-3.5 bg-border rounded w-36" />
                    <div className="h-2.5 bg-border rounded w-24" />
                  </div>
                  <div className="h-5 bg-border rounded w-14" />
                  <div className="h-3.5 bg-border rounded w-16" />
                  <div className="h-3.5 bg-border rounded w-20 ml-auto" />
                  <div className="h-3.5 bg-border rounded w-10" />
                  <div className="h-3.5 bg-border rounded w-10" />
                  <div className="h-7 w-7 bg-border rounded ml-auto" />
                </div>
              ))}
            </div>
          ) : isEntirelyEmpty ? (
            /* 4b. Entirely empty catalog */
            <div className="min-h-[260px] flex flex-col items-center justify-center p-8 text-center">
              <div className="w-10 h-10 rounded-lg bg-surface border border-border flex items-center justify-center text-muted mb-3">
                <Package className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-text">No items yet</h3>
              <p className="text-sm text-muted mt-1 max-w-sm">
                Save frequent services or goods to add them to invoices in one click.
              </p>
              <Button variant="primary" size="sm" onClick={openAdd} className="mt-4">
                <Plus className="w-3.5 h-3.5" />
                <span>Add item</span>
              </Button>
            </div>
          ) : isNoMatch ? (
            /* 4c. No matches for current filters */
            <div className="min-h-[200px] flex flex-col items-center justify-center p-6 text-center">
              <div className="w-10 h-10 rounded-lg bg-surface border border-border flex items-center justify-center text-muted mb-3">
                <Package className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-text">No matching items</h3>
              <p className="text-xs text-muted mt-1 max-w-sm">
                Try adjusting your type filter or clearing your search query.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { handleSearchChange(''); handleTypeChange('ALL'); }}
                className="mt-4"
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <>
              {/* 4d. Desktop Grid Table (≥ md) */}
              <div className="hidden md:block">
                {/* Header row */}
                <div
                  className={`${PRODUCTS_GRID} py-3 border-b border-border text-[12px] font-medium text-muted uppercase tracking-wider`}
                >
                  <div>Name</div>
                  <div>Type</div>
                  <div>HSN / SAC</div>
                  <div className="text-right">Rate</div>
                  <div>GST</div>
                  <div>Unit</div>
                  <div className="flex justify-end">
                    <span className="sr-only">Actions</span>
                  </div>
                </div>

                {/* Data rows */}
                <div
                  className={`divide-y divide-border ${isFetching ? 'opacity-60 pointer-events-none' : ''} transition-opacity`}
                >
                  {paginatedProducts.map((p) => {
                    const targetId = p._id || p.id;
                    return (
                      <div
                        key={targetId}
                        role="button"
                        tabIndex={0}
                        onClick={() => openEdit(p)}
                        onKeyDown={(e) => { if (e.key === 'Enter') openEdit(p); }}
                        className={`${PRODUCTS_GRID} h-14 hover:bg-surface/50 transition-colors cursor-pointer text-xs focus:outline-none focus:bg-surface/50`}
                      >
                        {/* Name + description */}
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-text truncate" title={p.name}>
                            {p.name}
                          </div>
                          {p.description && (
                            <div className="text-xs text-muted truncate mt-0.5" title={p.description}>
                              {p.description}
                            </div>
                          )}
                        </div>

                        {/* Type badge */}
                        <div>
                          <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md border border-border bg-surface text-muted whitespace-nowrap">
                            {p.type === 'Service' ? 'Service' : 'Goods'}
                          </span>
                        </div>

                        {/* HSN / SAC code */}
                        <div className="text-muted tabular-nums font-sans">
                          {p.hsnSac || <span className="text-faint">—</span>}
                        </div>

                        {/* Rate */}
                        <div className="text-text font-medium tabular-nums text-right">
                          {formatCurrency(p.rate ?? 0)}
                        </div>

                        {/* GST */}
                        <div className="text-muted">
                          {p.gstRate ?? 18}%
                        </div>

                        {/* Unit */}
                        <div className="text-muted truncate">
                          {p.unit || 'Nos'}
                        </div>

                        {/* Kebab menu */}
                        <div
                          className="flex justify-end"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu
                            ariaLabel={`Actions for ${p.name}`}
                            items={getMenuItems(p)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4e. Mobile Stacked Cards (< md) */}
              <div
                className={`md:hidden divide-y divide-border ${isFetching ? 'opacity-60 pointer-events-none' : ''} transition-opacity`}
              >
                {paginatedProducts.map((p) => {
                  const targetId = p._id || p.id;
                  return (
                    <div
                      key={targetId}
                      role="button"
                      tabIndex={0}
                      onClick={() => openEdit(p)}
                      onKeyDown={(e) => { if (e.key === 'Enter') openEdit(p); }}
                      className="p-4 space-y-1.5 hover:bg-surface/50 transition-colors cursor-pointer focus:outline-none focus:bg-surface/50"
                    >
                      {/* Top: Name + Rate + Kebab */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-text truncate">{p.name}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-semibold text-text tabular-nums whitespace-nowrap">
                            {formatCurrency(p.rate ?? 0)}
                          </span>
                          <div onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu
                              ariaLabel={`Actions for ${p.name}`}
                              items={getMenuItems(p)}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Muted detail line: HSN/SAC · Type · GST · Unit */}
                      <div className="text-xs text-muted flex items-center gap-1.5 flex-wrap">
                        {p.hsnSac && (
                          <>
                            <span className="tabular-nums font-sans">{p.hsnSac}</span>
                            <span className="text-faint">·</span>
                          </>
                        )}
                        <span>{p.type === 'Service' ? 'Service' : 'Goods'}</span>
                        <span className="text-faint">·</span>
                        <span>{p.gstRate ?? 18}% GST</span>
                        <span className="text-faint">·</span>
                        <span>{p.unit || 'Nos'}</span>
                      </div>

                      {/* Description (if present) */}
                      {p.description && (
                        <div className="text-xs text-muted truncate">{p.description}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ── 5. Pagination footer ─────────────────────────────────────── */}
        {!loading && total > limit && (
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={handleLimitChange}
            resourceName="items"
            loading={isFetching}
            className="border-t border-border -mx-4 sm:-mx-6 px-4 sm:px-6 sticky bottom-0 bg-bg"
          />
        )}

      </div>

      {/* ── Add / Edit Drawer ────────────────────────────────────────────── */}
      <ProductDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSave={handleSave}
        initialData={editingProduct}
        isDuplicate={isDuplicate}
      />

      {/* ── Delete Confirmation Dialog ───────────────────────────────────── */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title={`Delete ${deleteTarget?.name ?? 'item'}?`}
        description="This item will be removed from your catalog. Existing invoices are not affected."
        confirmLabel="Delete item"
        cancelLabel="Cancel"
        destructive
        loading={deleting}
        error={deleteError}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          if (!deleting) {
            setDeleteTarget(null);
            setDeleteError('');
          }
        }}
      />
    </div>
  );
}

export default Products;
