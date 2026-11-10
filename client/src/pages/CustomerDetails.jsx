/**
 * CustomerDetails.jsx — Customer Detail Page (/app/customers/:id)
 *
 * Design System:
 *  - Colors: strictly semantic tokens (bg, surface, border, text, muted, faint, accent, danger, warning)
 *  - Layout: Invoices are the main content spanning the full width at all breakpoints.
 *  - Header: Back link "Customers", name (20px/600), neutral type badge, muted 13px info subtitle (GSTIN, place of supply with mismatch check, phone, email), "New invoice" primary button, "View details" secondary button (icon-only below sm), and kebab menu.
 *  - Stats Strip: Single 3-column bordered strip (Total billed, Paid, Outstanding) with colored indicator dots and normal text color tabular-nums values.
 *  - Invoices: Unified grid rows directly on page, status filter (All, Paid, Issued, Draft, Cancelled) on right of Invoices heading.
 *  - Details Drawer: Accessible read-only slide-in drawer showing all customer details, quick-add links for missing fields, and Edit customer button.
 *  - TanStack Query: Separate parallel queries for customer detail, invoices list, and summary.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Plus,
  Edit3,
  Trash2,
  FileText,
  User,
  Info,
  AlertTriangle,
  Archive,
  ArchiveRestore
} from 'lucide-react';

import { useAuth } from '@/features/auth';
import { customersApi, customerQueryKeys } from '../api/customers.api';
import { invoicesApi, invoiceQueryKeys } from '../api/invoices.api';
import { useAppNavigate } from '../utils/navigation';
import { formatCurrency } from '../utils/currency';
import { normalizeCustomerType, getCustomerTypeLabel, CUSTOMER_TYPES } from '../utils/customer';
import { getStateByCode } from '../gst/taxRules';

import { Button } from '../components/invoice/InvoiceEditorUI';
import { CustomerDrawer } from '../components/customer/CustomerDrawer';
import { CustomerViewDrawer } from '../components/customer/CustomerViewDrawer';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { DropdownMenu } from '../components/ui/DropdownMenu';
import { InvoicesTable } from '../components/invoice/InvoicesTable';
import { PageHeader } from '../components/layout/PageHeader';

// Helper to check if GSTIN state code differs from customer place of supply
function checkStateMismatch(gstin, state) {
  if (!gstin || gstin.length < 2 || !state) return false;
  const code = gstin.slice(0, 2);
  const mapped = getStateByCode(code);
  if (!mapped) return false;
  return mapped.name.trim().toLowerCase() !== state.trim().toLowerCase();
}

export function CustomerDetails({ onNavigate: propOnNavigate }) {
  const { id } = useParams();
  const { isLoaded, isSignedIn } = useAuth();
  const isAuthReady = Boolean(isLoaded && isSignedIn);
  const queryClient = useQueryClient();
  const appNavigate = useAppNavigate();
  const onNavigate = propOnNavigate || appNavigate;

  // Status filter: 'All' | 'Paid' | 'Issued' | 'Draft' | 'Cancelled'
  const [statusFilter, setStatusFilter] = useState('All');

  // Customer View Drawer (read-only)
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);

  // Customer Drawer for Editing
  const [drawerOpen, setDrawerOpen] = useState(false);

  // In-app Delete Dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // 1. Customer detail query
  const {
    data: customerRes,
    isLoading: customerLoading,
    error: customerError,
    refetch: refetchCustomer
  } = useQuery({
    queryKey: customerQueryKeys.detail(id),
    queryFn: () => customersApi.get(id),
    enabled: isAuthReady && Boolean(id)
  });

  // 2. Invoices for customer query
  const {
    data: invoicesRes,
    isLoading: invoicesLoading
  } = useQuery({
    queryKey: invoiceQueryKeys.list({ customerId: id, limit: 100 }),
    queryFn: () => invoicesApi.list({ customerId: id, limit: 100 }),
    enabled: isAuthReady && Boolean(id)
  });

  // 3. Invoice summary for customer query
  const {
    data: summaryRes,
    isLoading: summaryLoading
  } = useQuery({
    queryKey: invoiceQueryKeys.summary(id),
    queryFn: () => invoicesApi.getSummary(id),
    enabled: isAuthReady && Boolean(id)
  });

  const customer = customerRes?.data || null;

  const invoices = useMemo(() => {
    const raw = invoicesRes?.data;
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.invoices)) return raw.invoices;
    return [];
  }, [invoicesRes]);

  const serverStats = summaryRes?.data || null;
  const loading = customerLoading || (invoicesLoading && !invoices.length);
  const error = customerError?.message || null;

  // Filter invoices for this customer
  const customerInvoices = useMemo(() => {
    if (!customer) return [];
    const cId = String(customer._id || customer.id || id);
    const cName = (customer.name || '').trim().toLowerCase();

    return invoices
      .filter((inv) => {
        const invCustId = String(inv.customerId || inv.customer?.id || inv.customer?._id || '');
        if (cId && invCustId === cId) return true;
        if (cName && (inv.customer?.name || '').trim().toLowerCase() === cName) return true;
        return false;
      })
      .sort((a, b) => new Date(b.invoiceDate || b.createdAt) - new Date(a.invoiceDate || a.createdAt));
  }, [customer, invoices, id]);

  // Status-filtered invoices
  const filteredInvoices = useMemo(() => {
    if (statusFilter === 'All') return customerInvoices;
    return customerInvoices.filter((inv) => inv.status === statusFilter);
  }, [customerInvoices, statusFilter]);

  // Stats: use authoritative server summary if available, fallback to list sum
  const stats = useMemo(() => {
    if (serverStats) {
      return {
        totalBilled: serverStats.totalBilled ?? 0,
        paid: serverStats.paid ?? 0,
        outstanding: serverStats.outstanding ?? 0,
      };
    }

    let totalBilled = 0;
    let paid = 0;
    let outstanding = 0;

    customerInvoices.forEach((inv) => {
      const net = Number(inv.netTotal ?? inv.grandTotal) || 0;
      if (inv.status !== 'Cancelled') {
        totalBilled += net;
      }
      if (inv.status === 'Paid') {
        paid += net;
      } else if (inv.status === 'Issued') {
        outstanding += net;
      }
    });

    return {
      totalBilled,
      paid,
      outstanding,
    };
  }, [serverStats, customerInvoices]);

  // Mutations
  const archiveMutation = useMutation({
    mutationFn: () => customersApi.archive(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: customerQueryKeys.all });
    },
    onError: (err) => alert(err.message || 'Failed to archive customer.')
  });

  const unarchiveMutation = useMutation({
    mutationFn: () => customersApi.unarchive(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: customerQueryKeys.all });
    },
    onError: (err) => alert(err.message || 'Failed to unarchive customer.')
  });

  const deleteMutation = useMutation({
    mutationFn: () => customersApi.delete(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: customerQueryKeys.all });
      setDeleteDialogOpen(false);
      onNavigate('customers');
    },
    onError: (err) => {
      setDeleteError(err.message || 'Failed to delete customer.');
    }
  });

  // Drawer save handler
  const handleSaveCustomer = async (formData) => {
    const targetId = customer?._id || customer?.id || id;
    const res = await customersApi.update(targetId, formData);
    await queryClient.invalidateQueries({ queryKey: customerQueryKeys.all });
    setDrawerOpen(false);
    return res;
  };

  // Switch from view drawer to edit drawer
  const handleEditFromView = () => {
    setViewDrawerOpen(false);
    setDrawerOpen(true);
  };

  // Delete handler
  const handleConfirmDelete = async () => {
    setDeleteError('');
    deleteMutation.mutate();
  };

  // PDF download handler
  const handleDownloadPDF = async (invoice) => {
    try {
      const { generateInvoicePDF } = await import('../pdf/generateInvoicePDF');
      generateInvoicePDF(invoice, { action: 'download' });
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    }
  };

  // Duplicate invoice handler
  const handleDuplicate = async (invoice) => {
    try {
      const targetId = invoice._id || invoice.id;
      const res = await invoicesApi.duplicate(targetId);
      queryClient.invalidateQueries({ queryKey: invoiceQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: customerQueryKeys.lists() });
      const newId = res?.data?._id || res?.data?.id;
      if (newId) {
        onNavigate('edit-invoice', newId);
      }
    } catch (err) {
      console.error('Failed to duplicate invoice:', err);
    }
  };

  // Cancel invoice handler
  const handleCancelInvoice = async (invoice) => {
    const targetId = invoice._id || invoice.id;
    try {
      await invoicesApi.cancel(targetId);
      queryClient.invalidateQueries({ queryKey: invoiceQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: customerQueryKeys.lists() });
    } catch (err) {
      console.error('Failed to cancel invoice:', err);
    }
  };

  const menuItems = useMemo(() => {
    return [
      {
        label: 'View details',
        icon: Info,
        onSelect: () => setViewDrawerOpen(true),
      },
      {
        label: 'Edit',
        icon: Edit3,
        onSelect: () => setDrawerOpen(true),
      },
      ...(customer?.isArchived
        ? [
            {
              label: 'Unarchive',
              icon: ArchiveRestore,
              onSelect: () => unarchiveMutation.mutate(),
            },
          ]
        : [
            {
              label: 'Archive',
              icon: Archive,
              onSelect: () => archiveMutation.mutate(),
            },
          ]),
      {
        label: 'Delete',
        icon: Trash2,
        danger: true,
        dividerBefore: true,
        onSelect: () => {
          setDeleteError('');
          setDeleteDialogOpen(true);
        },
      },
    ];
  }, [customer?.isArchived, archiveMutation, unarchiveMutation]);

  const normalizedType = normalizeCustomerType(
    customer?.customerType || (customer?.gstin ? 'registered' : 'unregistered')
  );
  const isRegistered = normalizedType === CUSTOMER_TYPES.REGISTERED;
  const isStateMismatch = customer ? checkStateMismatch(customer.gstin, customer.state) : false;

  // Single muted info subtitle items (only existing values, separated by " · ")
  const headerInfoItems = useMemo(() => {
    if (!customer) return [];
    const items = [];

    if (customer.gstin) {
      items.push({
        key: 'gstin',
        node: <span className="tabular-nums font-sans">{customer.gstin}</span>,
        text: customer.gstin,
      });
    }

    if (customer.state) {
      items.push({
        key: 'state',
        node: (
          <span className="inline-flex items-center gap-1">
            <span>{customer.state}</span>
            {isStateMismatch && (
              <span
                title="State differs from GSTIN state code"
                className="inline-flex items-center text-warning cursor-help"
              >
                <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="sr-only">State differs from GSTIN state code</span>
              </span>
            )}
          </span>
        ),
        text: customer.state,
      });
    }

    if (customer.phone) {
      items.push({
        key: 'phone',
        node: <span className="tabular-nums">+91 {customer.phone}</span>,
        text: `+91 ${customer.phone}`,
      });
    }

    if (customer.email) {
      items.push({
        key: 'email',
        node: <span className="break-all">{customer.email}</span>,
        text: customer.email,
      });
    }

    return items;
  }, [customer, isStateMismatch]);

  // ── Skeletons loading state ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="w-full bg-bg text-text font-sans">
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6 py-6 space-y-6 pb-24 lg:pb-12 animate-pulse">
          {/* Back link & title skeleton */}
          <div className="space-y-2">
            <div className="h-4 bg-border rounded w-24" />
            <div className="h-7 bg-border rounded w-64" />
            <div className="h-4 bg-border rounded w-96 max-w-full" />
          </div>

          {/* Stat strip skeleton (3 equal cells) */}
          <div className="grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-surface h-20" />

          {/* Full-width invoices skeleton */}
          <div className="h-96 rounded-xl border border-border bg-surface p-6" />
        </div>
      </div>
    );
  }

  // ── Customer not found state ───────────────────────────────────────────────
  if (!customer) {
    return (
      <div className="w-full bg-bg text-text font-sans">
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6 py-12">
          <div className="max-w-md mx-auto text-center p-8 rounded-xl border border-border bg-surface space-y-4">
            <div className="w-12 h-12 rounded-xl bg-border/50 text-muted flex items-center justify-center mx-auto">
              <User className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-text">Customer not found</h2>
              <p className="text-xs text-muted">
                {error || 'This customer record does not exist or may have been removed.'}
              </p>
            </div>
            <Button
              variant="secondary"
              size="md"
              onClick={() => onNavigate('customers')}
              className="inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Customers
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-bg text-text font-sans">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 py-6 space-y-6 pb-24 lg:pb-12">

        {/* ── 1. Top Navigation & Header ────────────────────────────────────── */}
        <PageHeader
          title={customer.name}
          backLink={{ label: 'Customers', onClick: () => onNavigate('customers') }}
          badge={
            <div className="flex items-center gap-1.5">
              <span
                title={
                  isRegistered
                    ? 'Registered business with a valid GSTIN'
                    : 'Unregistered business or consumer without GSTIN'
                }
                className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-md border border-border bg-surface text-muted cursor-help"
              >
                {getCustomerTypeLabel(normalizedType)}
              </span>
              {customer.isArchived && (
                <span
                  title="This customer is archived"
                  className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md border border-amber-500/20 bg-amber-500/10 text-amber-500"
                >
                  Archived
                </span>
              )}
            </div>
          }
          actions={
            <>
              {customer.isArchived ? (
                <span title="Archived customers cannot be billed on new invoices. Unarchive first.">
                  <Button
                    variant="primary"
                    size="md"
                    disabled
                    className="h-9 px-3.5 text-xs font-medium opacity-50 cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New invoice</span>
                  </Button>
                </span>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() =>
                    onNavigate('create-invoice', null, {
                      state: { customerId: customer._id || customer.id || id, customer },
                    })
                  }
                  className="h-9 px-3.5 text-xs font-medium"
                >
                  <Plus className="w-4 h-4" />
                  <span>New invoice</span>
                </Button>
              )}

              <button
                type="button"
                onClick={() => setViewDrawerOpen(true)}
                title="View customer details"
                aria-label="View customer details"
                className="h-9 px-3 rounded-lg border border-border bg-surface hover:bg-border/50 text-text text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <Info className="w-4 h-4 text-muted shrink-0" />
                <span className="hidden sm:inline">View details</span>
              </button>

              <DropdownMenu
                ariaLabel={`Actions for ${customer.name}`}
                items={menuItems}
              />
            </>
          }
        >
          {headerInfoItems.length > 0 && (
            <div
              className="text-[13px] text-muted line-clamp-2 sm:truncate leading-normal flex items-center flex-wrap gap-x-1.5 gap-y-0.5 mt-1"
              title={headerInfoItems.map((i) => i.text).join(' · ')}
            >
              {headerInfoItems.map((item, idx) => (
                <React.Fragment key={item.key}>
                  {idx > 0 && (
                    <span className="text-faint select-none" aria-hidden="true">
                      ·
                    </span>
                  )}
                  {item.node}
                </React.Fragment>
              ))}
            </div>
          )}
        </PageHeader>

        {/* ── 2. Stat Strip (3 equal cells across all screen sizes) ─────────── */}
        <div className="grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-surface overflow-hidden">
          {/* Total billed */}
          <div className="p-3 sm:p-4 space-y-1 min-w-0">
            <span className="text-xs sm:text-[13px] font-medium text-muted block truncate">
              Total billed
            </span>
            <div className="text-base sm:text-[20px] font-semibold text-text tabular-nums tracking-tight truncate">
              {formatCurrency(stats.totalBilled)}
            </div>
          </div>

          {/* Paid */}
          <div className="p-3 sm:p-4 space-y-1 min-w-0">
            <span className="text-xs sm:text-[13px] font-medium text-muted flex items-center truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 shrink-0" aria-hidden="true" />
              <span className="truncate">Paid</span>
            </span>
            <div className="text-base sm:text-[20px] font-semibold text-text tabular-nums tracking-tight truncate">
              {formatCurrency(stats.paid)}
            </div>
          </div>

          {/* Outstanding */}
          <div className="p-3 sm:p-4 space-y-1 min-w-0">
            <span className="text-xs sm:text-[13px] font-medium text-muted flex items-center truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5 shrink-0" aria-hidden="true" />
              <span className="truncate">Outstanding</span>
            </span>
            <div className="text-base sm:text-[20px] font-semibold text-text tabular-nums tracking-tight truncate">
              {formatCurrency(stats.outstanding)}
            </div>
          </div>
        </div>

        {/* ── 3. Main Content: Invoices (full content width at every breakpoint) ── */}
        <div className="w-full space-y-4 min-w-0">
          {/* Section heading "Invoices" with count + status filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
            <div className="flex items-baseline gap-2">
              <h2 className="text-[15px] font-semibold text-text tracking-tight">Invoices</h2>
              <span className="text-xs font-normal text-muted tabular-nums">
                {customerInvoices.length}
              </span>
            </div>

            {/* Status filter on the right: All, Paid, Issued, Draft, Cancelled */}
            {customerInvoices.length > 0 && (
              <div className="flex items-center gap-1 overflow-x-auto">
                {['All', 'Paid', 'Issued', 'Draft', 'Cancelled'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={[
                      'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0',
                      statusFilter === st
                        ? 'bg-accent text-text'
                        : 'text-muted hover:text-text hover:bg-border/60',
                    ].join(' ')}
                  >
                    {st}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Invoices list sits directly on the page, no outer card or overflow container */}
          <InvoicesTable
            invoices={filteredInvoices}
            loading={false}
            onNavigate={onNavigate}
            onDownloadPDF={handleDownloadPDF}
            onDuplicate={handleDuplicate}
            onCancel={handleCancelInvoice}
            emptyState={
              <div className="min-h-[200px] flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-border bg-surface/30">
                <div className="w-10 h-10 rounded-lg bg-surface border border-border flex items-center justify-center text-muted mb-3">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-text">
                  {statusFilter !== 'All'
                    ? `No ${statusFilter.toLowerCase()} invoices for ${customer.name}`
                    : `No invoices for ${customer.name} yet`}
                </h3>
                <p className="text-xs text-muted mt-1 max-w-sm">
                  {statusFilter !== 'All'
                    ? 'Try selecting a different status filter.'
                    : 'Create a new GST invoice for this customer to begin billing.'}
                </p>
                {!customer.isArchived && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() =>
                      onNavigate('create-invoice', null, {
                        state: { customerId: customer._id || customer.id || id, customer },
                      })
                    }
                    className="mt-4"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create invoice</span>
                  </Button>
                )}
              </div>
            }
          />
        </div>

      </div>

      {/* ── Read-only Customer Details Drawer ──────────────────────────────── */}
      <CustomerViewDrawer
        isOpen={viewDrawerOpen}
        onClose={() => setViewDrawerOpen(false)}
        onEdit={handleEditFromView}
        customer={customer}
      />

      {/* ── Customer Drawer for Editing ────────────────────────────────────── */}
      <CustomerDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSave={handleSaveCustomer}
        initialData={customer}
      />

      {/* ── In-App Delete Confirmation Dialog ──────────────────────────────── */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title={
          customerInvoices.length > 0
            ? `Can't delete ${customer.name}`
            : `Delete ${customer.name}?`
        }
        description={
          customerInvoices.length > 0
            ? `This customer has ${customerInvoices.length} ${
                customerInvoices.length === 1 ? 'invoice' : 'invoices'
              }. Invoices are tax records and must be kept. You can archive the customer instead.`
            : "This customer will be permanently removed. This can't be undone."
        }
        confirmLabel={customerInvoices.length > 0 ? (customer.isArchived ? null : 'Archive customer') : 'Delete customer'}
        cancelLabel={customerInvoices.length > 0 ? 'Close' : 'Cancel'}
        destructive={customerInvoices.length === 0}
        loading={deleteMutation.isPending || archiveMutation.isPending}
        error={deleteError}
        onConfirm={() => {
          if (customerInvoices.length > 0) {
            archiveMutation.mutate(undefined, {
              onSuccess: () => setDeleteDialogOpen(false)
            });
          } else {
            handleConfirmDelete();
          }
        }}
        onCancel={() => {
          if (!deleteMutation.isPending && !archiveMutation.isPending) setDeleteDialogOpen(false);
        }}
      />
    </div>
  );
}

export default CustomerDetails;
