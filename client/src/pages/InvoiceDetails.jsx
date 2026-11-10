/**
 * InvoiceDetails.jsx — GST Tax Invoice View Page (/app/invoices/:id)
 *
 * Design System:
 *  - Colors: strictly semantic tokens (bg, surface, border, text, muted, faint, accent, danger)
 *  - Layout: max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-6 font-sans, pb-24 lg:pb-12
 *  - Header: back link "Invoices" (preserves query string/filters), invoice number (or "Draft"),
 *    StatusBadge, primary action button, "Download PDF" secondary button (icon-only below sm with tooltip),
 *    and Radix DropdownMenu kebab.
 *  - Two columns from lg: main 1fr and side panel 320px (sticky top-6), gap-8.
 *  - Below lg: compact summary strip (customer, total, status) above document, document in
 *    overflow-x-auto, sticky bottom bar for primary action with safe-area padding.
 *  - Main: existing GST invoice document preview inside one surface container (no nested cards).
 *  - Quiet status banners above document (Cancelled, Draft).
 *  - Side panel: Summary, Payment, and Activity timeline separated by 1px dividers.
 *  - ConfirmDialog with specific button labels and inline error display for 409/422.
 *  - TanStack Query invalidation across detail, list, counts, summary, and customers/list.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useLocation, useNavigate, Link, Navigate, useSearchParams } from 'react-router-dom';
import { PATHS } from '@/app/routes/paths';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Download,
  Printer,
  Edit3,
  Copy,
  Trash2,
  CheckCircle2,
  Mail,
  XCircle,
  RefreshCw,
  X,
  AlertCircle,
  FileText,
  Clock,
  ExternalLink
} from 'lucide-react';

import { useAuth } from '@/features/auth';
import { invoicesApi, invoiceQueryKeys } from '../api/invoices.api';
import { customerQueryKeys } from '../api/customers.api';
import { formatCurrency, numberToWords } from '../utils/currency';
import { formatDate } from '../utils/date';
import { formatDDMMYYYY, StatusBadge } from '../components/invoice/InvoicesTable';
import { getStateByName, getStateByCode } from '../gst/taxRules';
import { getCustomerTypeLabel } from '../utils/customer';
import { useAppNavigate } from '../utils/navigation';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/invoice/InvoiceEditorUI';
import { DropdownMenu } from '../components/ui/DropdownMenu';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export function InvoiceDetails({ invoiceId: propInvoiceId, onNavigate: propOnNavigate }) {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const appNavigate = useAppNavigate();
  const onNavigate = propOnNavigate || appNavigate;
  const invoiceId = propInvoiceId || params.id;
  const { isLoaded, isSignedIn, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Allow view mode override via ?view=true (otherwise drafts redirect to editor)
  const allowDraftView = searchParams.get('view') === 'true';

  // Confirmation dialog state
  const [confirmState, setConfirmState] = useState({
    type: null, // 'issue' | 'mark-paid' | 'mark-unpaid' | 'cancel' | 'delete'
    loading: false,
    error: ''
  });

  // Email modal state
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

  // TanStack Query for invoice details
  const {
    data: invoiceRes,
    isLoading: loading,
    error: queryError,
    refetch
  } = useQuery({
    queryKey: invoiceQueryKeys.detail(invoiceId),
    queryFn: () => invoicesApi.get(invoiceId),
    enabled: Boolean(isLoaded && isSignedIn && invoiceId)
  });

  const invoice = invoiceRes?.data || null;

  // Sync emailForm and deliveryStatus
  useEffect(() => {
    if (invoice) {
      setEmailForm({
        recipientEmail: invoice.customer?.email || '',
        recipientName: invoice.customer?.name || '',
        subject: `Invoice ${invoice.invoiceNumber || 'Draft'} from ${invoice.business?.businessName || 'Business'}`,
        message: `Dear ${invoice.customer?.name || 'Customer'},\n\nPlease find attached details for Tax Invoice ${invoice.invoiceNumber || 'Draft'}.\nTotal Amount: ₹${Number(invoice.netTotal ?? invoice.grandTotal ?? 0).toFixed(2)}.\n\nThank you for your business!`
      });

      if (invoice.emailDeliveryStatus && invoice.emailDeliveryStatus !== 'NOT_QUEUED') {
        setDeliveryStatus({
          status: invoice.emailDeliveryStatus,
          recipientEmail: invoice.emailLastSentTo,
          sentAt: invoice.emailLastSentAt
        });
      }
    }
  }, [invoice]);

  // Tab-visibility-aware email polling
  useEffect(() => {
    const isPending = deliveryStatus && ['PENDING', 'PROCESSING', 'RETRY_SCHEDULED'].includes(deliveryStatus.status);
    if (!isPending || !invoiceId) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }

    const poll = async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      try {
        const res = await invoicesApi.getEmailStatus(invoiceId);
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
    };

    pollingRef.current = setInterval(poll, 4000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [deliveryStatus?.status, invoiceId]);

  // Handle back link (preserves query string/filters from invoices list)
  const handleBack = () => {
    const fromUrl = location.state?.from;
    if (fromUrl) {
      navigate(fromUrl);
    } else {
      onNavigate('invoices');
    }
  };

  // TanStack Query invalidation helper
  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: invoiceQueryKeys.detail(invoiceId) }),
      queryClient.invalidateQueries({ queryKey: invoiceQueryKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: ['invoices', 'counts'] }),
      queryClient.invalidateQueries({ queryKey: ['invoices', 'summary'] }),
      queryClient.invalidateQueries({ queryKey: customerQueryKeys.all })
    ]);
  };

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: (id) => invoicesApi.duplicate(id),
    onSuccess: async (res) => {
      await invalidateAll();
      const newId = res?.data?.id || res?.data?._id;
      if (newId) onNavigate('edit-invoice', newId);
    },
    onError: (err) => {
      alert(err.message || 'Failed to duplicate invoice.');
    }
  });

  // Uniform GST rate calculation across line items (unconditional hook before early returns)
  const uniformGstRate = useMemo(() => {
    const items = invoice?.items || [];
    const taxType = invoice?.taxType || 'INTRA';
    if (!items.length) return null;
    const firstRate = taxType === 'INTRA' ? items[0].cgstRate : items[0].igstRate;
    const allMatch = items.every((item) => {
      const r = taxType === 'INTRA' ? item.cgstRate : item.igstRate;
      return Number(r) === Number(firstRate);
    });
    return allMatch ? Number(firstRate) : null;
  }, [invoice?.items, invoice?.taxType]);

  const handleDuplicate = () => {
    if (!invoice) return;
    const targetId = invoice._id || invoice.id;
    duplicateMutation.mutate(targetId);
  };

  // Print handler
  const handlePrint = () => {
    window.print();
  };

  // PDF download handler
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

  // Email submission handler
  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!invoice) return;

    if (!isAuthenticated) {
      alert('Email delivery requires being signed in.');
      onNavigate('sign-in');
      return;
    }

    const targetId = invoice._id || invoice.id;
    setIsSendingEmail(true);
    setEmailFeedback(null);

    try {
      await invoicesApi.sendEmail(targetId, {
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

      setTimeout(() => {
        setIsEmailModalOpen(false);
      }, 1500);
    } catch (err) {
      setEmailFeedback({
        type: 'error',
        message: err.message || 'Failed to queue email.'
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Confirm dialog action handler with 409/422 error mapping
  const handleConfirmAction = async () => {
    const type = confirmState.type;
    if (!type || !invoice) return;
    const targetId = invoice._id || invoice.id;

    setConfirmState((prev) => ({ ...prev, loading: true, error: '' }));

    try {
      if (type === 'mark-paid') {
        await invoicesApi.markPaid(targetId);
      } else if (type === 'mark-unpaid') {
        await invoicesApi.markUnpaid(targetId);
      } else if (type === 'issue') {
        await invoicesApi.issue(targetId);
      } else if (type === 'cancel') {
        await invoicesApi.cancel(targetId);
      } else if (type === 'delete') {
        await invoicesApi.deleteDraft(targetId);
      }

      await invalidateAll();
      setConfirmState({ type: null, loading: false, error: '' });

      if (type === 'delete') {
        handleBack();
      }
    } catch (err) {
      let msg = err.message || 'Action failed. Please try again.';
      if (err.status === 409) {
        msg = err.message || 'Invoice has already been updated or has a conflicting status.';
      } else if (err.status === 422) {
        msg = err.message || 'Validation failed. Please verify that all invoice details are complete.';
      }
      setConfirmState((prev) => ({ ...prev, loading: false, error: msg }));
    }
  };

  // Redirect drafts to editor automatically unless ?view=true is specified
  if (invoice && invoice.status === 'Draft' && !allowDraftView) {
    return (
      <Navigate
        to={PATHS.APP.invoiceEdit(invoice._id || invoice.id)}
        replace
        state={location.state}
      />
    );
  }

  // Loading skeleton matching 2-column layout
  if (loading) {
    return (
      <div className="w-full bg-bg text-text font-sans">
        <div className="max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6 animate-pulse">
          <div className="space-y-2">
            <div className="h-4 bg-border rounded w-20" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-7 bg-border rounded w-48" />
                <div className="h-5 bg-border rounded w-16" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-9 bg-border rounded w-28" />
                <div className="h-9 bg-border rounded w-9" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-8 items-start">
            <div className="h-[650px] bg-surface rounded-xl border border-border" />
            <div className="h-[360px] bg-surface rounded-xl border border-border" />
          </div>
        </div>
      </div>
    );
  }

  // Not found (404/400)
  const isNotFound =
    !invoice ||
    queryError?.status === 404 ||
    queryError?.status === 400 ||
    queryError?.code === 'INVALID_ID' ||
    queryError?.code === 'INVOICE_NOT_FOUND';

  if (!loading && (isNotFound || (!invoice && queryError))) {
    return (
      <div className="w-full bg-bg text-text font-sans">
        <div className="max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-12">
          <div className="max-w-md mx-auto text-center p-8 rounded-xl border border-border bg-surface space-y-4">
            <div className="w-12 h-12 rounded-xl bg-border/50 text-muted flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-text">Invoice not found</h2>
              <p className="text-xs text-muted">
                This invoice does not exist or may have been removed.
              </p>
            </div>
            <Button
              variant="secondary"
              size="md"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Invoices
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Other error with Retry
  if (!loading && queryError) {
    return (
      <div className="w-full bg-bg text-text font-sans">
        <div className="max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-12">
          <div className="max-w-md mx-auto text-center p-8 rounded-xl border border-border bg-surface space-y-4">
            <div className="w-12 h-12 rounded-xl bg-danger/10 text-danger flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-text">Failed to load invoice</h2>
              <p className="text-xs text-muted">
                {queryError.message || 'Unable to load invoice details. Please check your connection.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <Button variant="secondary" size="md" onClick={handleBack}>
                Back to Invoices
              </Button>
              <Button variant="primary" size="md" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Invoice variables
  const business = invoice.business || {};
  const customer = invoice.customer || {};
  const items = invoice.items || [];
  const taxType = invoice.taxType || 'INTRA';
  const posState = invoice.placeOfSupply || customer.state || business.state || '';
  const posObj = getStateByName(posState) || getStateByCode(posState);
  const posName = posObj ? `${posObj.name} (${posObj.code})` : posState;
  const netTotal = Number(invoice.netTotal ?? invoice.grandTotal ?? 0);
  const customerId = invoice.customerId || customer.id || customer._id;
  const hasRealCustomerId = Boolean(customerId);
  const customerName = customer.name || 'Walk-in Customer';
  const invoiceTitle = invoice.invoiceNumber || 'Draft';

  // Build kebab menu items based on status
  const getKebabItems = () => {
    const isDraft = invoice.status === 'Draft';
    const isIssued = invoice.status === 'Issued';
    const isPaid = invoice.status === 'Paid';
    const isCancelled = invoice.status === 'Cancelled';

    const menu = [];

    if (isDraft) {
      menu.push({
        label: 'Duplicate',
        icon: Copy,
        onSelect: handleDuplicate
      });
      menu.push({
        label: 'Delete draft',
        icon: Trash2,
        danger: true,
        dividerBefore: true,
        onSelect: () => setConfirmState({ type: 'delete', loading: false, error: '' })
      });
    }

    if (isIssued) {
      menu.push({
        label: 'Send email',
        icon: Mail,
        onSelect: () => setIsEmailModalOpen(true)
      });
      menu.push({
        label: 'Print',
        icon: Printer,
        onSelect: handlePrint
      });
      menu.push({
        label: 'Duplicate',
        icon: Copy,
        onSelect: handleDuplicate
      });
      menu.push({
        label: 'Cancel invoice',
        icon: XCircle,
        danger: true,
        dividerBefore: true,
        onSelect: () => setConfirmState({ type: 'cancel', loading: false, error: '' })
      });
    }

    if (isPaid) {
      menu.push({
        label: 'Mark as unpaid',
        icon: RefreshCw,
        onSelect: () => setConfirmState({ type: 'mark-unpaid', loading: false, error: '' })
      });
      menu.push({
        label: 'Send email',
        icon: Mail,
        onSelect: () => setIsEmailModalOpen(true)
      });
      menu.push({
        label: 'Print',
        icon: Printer,
        onSelect: handlePrint
      });
      menu.push({
        label: 'Duplicate',
        icon: Copy,
        onSelect: handleDuplicate
      });
    }

    if (isCancelled) {
      menu.push({
        label: 'Print',
        icon: Printer,
        onSelect: handlePrint
      });
      menu.push({
        label: 'Duplicate',
        icon: Copy,
        onSelect: handleDuplicate
      });
    }

    return menu;
  };

  // Build activity timeline items from existing timestamps
  const activityEvents = [];
  if (invoice.createdAt) {
    activityEvents.push({
      label: 'Draft created',
      date: formatDate(invoice.createdAt),
      dotClass: 'bg-muted'
    });
  }
  if (invoice.issuedAt || (invoice.status !== 'Draft' && invoice.invoiceDate)) {
    activityEvents.push({
      label: 'Invoice issued',
      date: formatDate(invoice.issuedAt || invoice.invoiceDate),
      dotClass: 'bg-indigo-400'
    });
  }
  const paidTimestamp = invoice.paidAt || (invoice.status === 'Paid' ? invoice.updatedAt : null);
  if (paidTimestamp) {
    activityEvents.push({
      label: 'Marked as paid',
      date: formatDate(paidTimestamp),
      dotClass: 'bg-emerald-400'
    });
  }
  const cancelledTimestamp = invoice.cancelledAt || (invoice.status === 'Cancelled' ? invoice.updatedAt : null);
  if (cancelledTimestamp) {
    activityEvents.push({
      label: 'Invoice cancelled',
      date: formatDate(cancelledTimestamp),
      dotClass: 'bg-danger'
    });
  }

  // Primary Action Button (Header & Bottom Bar)
  const renderPrimaryAction = () => {
    if (invoice.status === 'Draft') {
      return (
        <Button
          variant="primary"
          size="sm"
          onClick={() => setConfirmState({ type: 'issue', loading: false, error: '' })}
          className="h-9 px-3 text-xs shrink-0"
        >
          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
          <span>Issue</span>
        </Button>
      );
    }

    if (invoice.status === 'Issued') {
      return (
        <Button
          variant="primary"
          size="sm"
          onClick={() => setConfirmState({ type: 'mark-paid', loading: false, error: '' })}
          className="h-9 px-3 text-xs shrink-0"
        >
          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
          <span>Mark as paid</span>
        </Button>
      );
    }

    return null;
  };

  const primaryActionButton = renderPrimaryAction();

  return (
    <div className="w-full bg-bg text-text font-sans flex flex-col min-h-full">
      <div className="max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6 pb-28 lg:pb-12 flex-1 flex flex-col">
        {/* ── 1. Page Header ──────────────────────────────────────────────── */}
        <PageHeader
          title={invoiceTitle}
          backLink={{
            label: 'Invoices',
            onClick: handleBack
          }}
          badge={<StatusBadge status={invoice.status} />}
          actions={
            <div className="flex items-center gap-2">
              {/* Draft only: secondary Edit button */}
              {invoice.status === 'Draft' && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onNavigate('edit-invoice', invoice._id || invoice.id)}
                  className="h-9 px-3 text-xs shrink-0"
                >
                  <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                  <span>Edit</span>
                </Button>
              )}

              {/* Primary action (Draft: Issue, Issued: Mark as paid) */}
              <div className="hidden lg:flex items-center">
                {primaryActionButton}
              </div>

              {/* Download PDF secondary button (icon-only below sm with tooltip) */}
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownloadPDF}
                aria-label="Download PDF"
                title="Download PDF"
                className="h-9 px-2.5 sm:px-3 text-xs shrink-0"
              >
                <Download className="w-3.5 h-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Download PDF</span>
              </Button>

              {/* Dropdown Kebab Menu */}
              <DropdownMenu
                ariaLabel={`Actions for invoice ${invoice.invoiceNumber || 'draft'}`}
                items={getKebabItems()}
              />
            </div>
          }
        />

        {/* ── 2. Compact Summary Strip (< lg) ─────────────────────────────── */}
        <div className="lg:hidden rounded-xl border border-border bg-surface p-3.5 flex items-center justify-between gap-3 text-xs">
          <div className="min-w-0 flex-1">
            <span className="text-[11px] text-muted block">Customer</span>
            {hasRealCustomerId ? (
              <Link
                to={PATHS.APP.customer(customerId)}
                className="font-medium text-text hover:text-accent hover:underline truncate block"
              >
                {customerName}
              </Link>
            ) : (
              <span className="font-medium text-text truncate block">{customerName}</span>
            )}
          </div>
          <div className="text-right shrink-0 px-2">
            <span className="text-[11px] text-muted block">Total</span>
            <span className="font-semibold text-text tabular-nums">{formatCurrency(netTotal)}</span>
          </div>
          <div className="shrink-0">
            <StatusBadge status={invoice.status} />
          </div>
        </div>

        {/* ── 3. Quiet Status Banners ─────────────────────────────────────── */}
        {invoice.status === 'Cancelled' && (
          <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-2.5 text-xs text-danger flex items-center gap-2">
            <XCircle className="w-4 h-4 shrink-0 text-danger" />
            <span>
              Cancelled on {formatDate(invoice.cancelledAt || invoice.updatedAt)}
            </span>
          </div>
        )}

        {invoice.status === 'Draft' && (
          <div className="rounded-lg border border-border bg-surface/50 px-4 py-2.5 text-xs text-muted flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-muted" />
            <span>Draft. Not yet issued.</span>
          </div>
        )}

        {/* ── 4. Main Two-Column Layout ───────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-8 items-start">
          {/* ══ MAIN COLUMN: Document Sheet in one surface container ════════ */}
          <main className="min-w-0">
            <div className="relative rounded-xl border border-border bg-surface p-6 sm:p-10 overflow-hidden text-xs text-text shadow-xs print-page">
              {/* Large muted DRAFT or CANCELLED watermark stamp */}
              {(invoice.status === 'Cancelled' || invoice.status === 'Draft') && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 flex items-center justify-center select-none overflow-hidden z-0"
                >
                  <span className="text-7xl sm:text-9xl font-black uppercase tracking-widest text-muted/[0.08] dark:text-muted/[0.12] -rotate-12">
                    {invoice.status === 'Cancelled' ? 'CANCELLED' : 'DRAFT'}
                  </span>
                </div>
              )}

              {/* Document Inner Surface */}
              <div className="relative z-10 space-y-5">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-border pb-5 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-text text-bg flex items-center justify-center font-bold text-sm shrink-0">
                      ₹
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold tracking-tight text-text uppercase">
                        Tax Invoice
                      </h2>
                      <p className="text-[11px] text-muted mt-0.5">Original for Recipient · Rule 46 of CGST Rules</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] text-muted font-medium">Original for Recipient</p>
                    <p className="text-[10px] text-faint">Section 31 CGST Act</p>
                  </div>
                </div>

                {/* Business & Invoice Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-2 border-b border-border">
                  {/* Supplier Details */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted block">
                      Billed By (Supplier)
                    </span>
                    <h3 className="text-sm font-bold text-text">
                      {business.businessName || 'Business Name'}
                    </h3>
                    {business.gstin && (
                      <p className="text-[11px] text-text tabular-nums">
                        <span className="text-muted">GSTIN:</span> {business.gstin}
                      </p>
                    )}
                    {business.pan && (
                      <p className="text-[11px] text-text tabular-nums">
                        <span className="text-muted">PAN:</span> {business.pan}
                      </p>
                    )}
                    {business.address && (
                      <p className="text-muted whitespace-pre-line leading-relaxed">
                        {business.address}
                      </p>
                    )}
                    {business.state && (
                      <p className="text-muted">
                        <span>State:</span> {business.state}
                      </p>
                    )}
                    {(business.phone || business.email) && (
                      <p className="text-muted text-[11px]">
                        {[business.phone, business.email].filter(Boolean).join(' • ')}
                      </p>
                    )}
                  </div>

                  {/* Invoice Meta Grid — Plain rows separated by 1px dividers (one surface) */}
                  <div className="divide-y divide-border/60 text-xs self-start">
                    <div className="flex justify-between py-1.5 first:pt-0">
                      <span className="text-muted">Invoice No:</span>
                      <span className="font-semibold text-text tabular-nums">{invoice.invoiceNumber || '—'}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-muted">Invoice Date:</span>
                      <span className="font-medium text-text tabular-nums">{formatDate(invoice.invoiceDate)}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-muted">Due Date:</span>
                      <span className="font-medium text-text tabular-nums">
                        {invoice.dueDate ? formatDate(invoice.dueDate) : 'Immediate'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-muted">Place of Supply:</span>
                      <span className="font-medium text-text">{posName || '—'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 last:pb-0">
                      <span className="text-muted">Tax Type:</span>
                      <span className="font-medium text-text">
                        {taxType === 'INTRA' ? 'Intra-State (CGST + SGST)' : 'Inter-State (IGST)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bill To / Recipient */}
                <div className="py-2 border-b border-border space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted block">
                    Bill To / Recipient
                  </span>
                  <h3 className="text-sm font-bold text-text">
                    {customer.name || 'Walk-in Customer'}
                  </h3>
                  {customer.gstin ? (
                    <p className="text-[11px] text-text tabular-nums">
                      <span className="text-muted">GSTIN:</span> {customer.gstin}
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted">
                      Tax Status: {getCustomerTypeLabel(customer.customerType)}
                    </p>
                  )}
                  {customer.address && (
                    <p className="text-muted whitespace-pre-line leading-relaxed">
                      {customer.address}
                    </p>
                  )}
                  {customer.state && (
                    <p className="text-muted">
                      <span>State:</span> {customer.state}
                    </p>
                  )}
                  {(customer.phone || customer.email) && (
                    <p className="text-muted text-[11px]">
                      {[customer.phone, customer.email].filter(Boolean).join(' • ')}
                    </p>
                  )}
                </div>

                {/* Line Items Table */}
                <div className="py-2 overflow-x-auto">
                  <table className="w-full border-collapse border border-border text-left text-xs">
                    <thead>
                      <tr className="bg-bg text-muted font-medium border-b border-border text-[11px] uppercase tracking-wider">
                        <th className="py-2.5 px-3 border border-border w-10 text-center">#</th>
                        <th className="py-2.5 px-3 border border-border text-left">Description</th>
                        <th className="py-2.5 px-3 border border-border w-24 text-center">HSN/SAC</th>
                        <th className="py-2.5 px-3 border border-border w-20 text-right">Qty</th>
                        <th className="py-2.5 px-3 border border-border w-28 text-right">Rate</th>
                        <th className="py-2.5 px-3 border border-border w-28 text-right">Taxable</th>
                        {taxType === 'INTRA' ? (
                          <>
                            <th className="py-2.5 px-3 border border-border w-28 text-right">
                              {uniformGstRate !== null ? `CGST ${uniformGstRate}%` : 'CGST'}
                            </th>
                            <th className="py-2.5 px-3 border border-border w-28 text-right">
                              {uniformGstRate !== null ? `SGST ${uniformGstRate}%` : 'SGST'}
                            </th>
                          </>
                        ) : (
                          <th className="py-2.5 px-3 border border-border w-28 text-right">
                            {uniformGstRate !== null ? `IGST ${uniformGstRate}%` : 'IGST'}
                          </th>
                        )}
                        <th className="py-2.5 px-3 border border-border w-32 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-bg/40 transition-colors">
                          <td className="py-2.5 px-3 border border-border text-center text-muted tabular-nums">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 border border-border font-medium text-text whitespace-pre-line leading-relaxed">
                            {item.description}
                          </td>
                          <td className="py-2.5 px-3 border border-border text-center tabular-nums text-muted">
                            {item.hsnSac || '—'}
                          </td>
                          <td className="py-2.5 px-3 border border-border text-right tabular-nums text-text">
                            {item.quantity} {item.unit || ''}
                          </td>
                          <td className="py-2.5 px-3 border border-border text-right tabular-nums text-text">
                            {formatCurrency(item.rate)}
                          </td>
                          <td className="py-2.5 px-3 border border-border text-right tabular-nums text-text">
                            {formatCurrency(item.taxableAmount)}
                          </td>
                          {taxType === 'INTRA' ? (
                            <>
                              <td className="py-2.5 px-3 border border-border text-right tabular-nums text-text">
                                {uniformGstRate === null && (
                                  <span className="text-[10px] text-muted block tabular-nums">{item.cgstRate || 0}%</span>
                                )}
                                <span>{formatCurrency(item.cgstAmount)}</span>
                              </td>
                              <td className="py-2.5 px-3 border border-border text-right tabular-nums text-text">
                                {uniformGstRate === null && (
                                  <span className="text-[10px] text-muted block tabular-nums">{item.sgstRate || 0}%</span>
                                )}
                                <span>{formatCurrency(item.sgstAmount)}</span>
                              </td>
                            </>
                          ) : (
                            <td className="py-2.5 px-3 border border-border text-right tabular-nums text-text">
                              {uniformGstRate === null && (
                                <span className="text-[10px] text-muted block tabular-nums">{item.igstRate || 0}%</span>
                              )}
                              <span>{formatCurrency(item.igstAmount)}</span>
                            </td>
                          )}
                          <td className="py-2.5 px-3 border border-border text-right tabular-nums font-semibold text-text">
                            {formatCurrency(item.totalAmount)}
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
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted block">
                        Total Amount in Words
                      </span>
                      <p className="text-xs font-medium text-text mt-1 leading-snug">
                        {numberToWords(netTotal)}
                      </p>
                    </div>

                    {invoice.bankDetails && (invoice.bankDetails.accountNumber || invoice.bankDetails.upiId) && (
                      <div className="pt-3 border-t border-border/60 text-[11px] space-y-1">
                        <span className="font-semibold text-text uppercase tracking-wider text-[10px] block">
                          Bank Details
                        </span>
                        {invoice.bankDetails.bankName && (
                          <p className="text-muted">
                            <span className="text-faint">Bank:</span> {invoice.bankDetails.bankName}
                            {invoice.bankDetails.branch ? ` (${invoice.bankDetails.branch})` : ''}
                          </p>
                        )}
                        {invoice.bankDetails.accountNumber && (
                          <p className="text-muted tabular-nums">
                            <span className="text-faint">A/C No:</span> {invoice.bankDetails.accountNumber}
                            <span className="text-faint ml-2">IFSC:</span> {invoice.bankDetails.ifscCode || '—'}
                          </p>
                        )}
                        {invoice.bankDetails.upiId && (
                          <p className="text-muted">
                            <span className="text-faint">UPI ID:</span> {invoice.bankDetails.upiId}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Totals block — Plain rows separated by 1px dividers (one surface) */}
                  <div className="divide-y divide-border/60 text-xs">
                    <div className="flex justify-between py-1.5 first:pt-0">
                      <span className="text-muted">Taxable Value:</span>
                      <span className="tabular-nums font-medium text-text">{formatCurrency(invoice.taxableAmount)}</span>
                    </div>
                    {taxType === 'INTRA' ? (
                      <>
                        <div className="flex justify-between py-1.5">
                          <span className="text-muted">Total CGST:</span>
                          <span className="tabular-nums font-medium text-text">{formatCurrency(invoice.cgst)}</span>
                        </div>
                        <div className="flex justify-between py-1.5">
                          <span className="text-muted">Total SGST:</span>
                          <span className="tabular-nums font-medium text-text">{formatCurrency(invoice.sgst)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between py-1.5">
                        <span className="text-muted">Total IGST:</span>
                        <span className="tabular-nums font-medium text-text">{formatCurrency(invoice.igst)}</span>
                      </div>
                    )}
                    {Math.abs(Number(invoice.roundOff || 0)) > 0.001 ? (
                      <div className="flex justify-between py-1.5 text-muted">
                        <span>Round Off:</span>
                        <span className="tabular-nums">{formatCurrency(invoice.roundOff)}</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between py-2 text-sm font-bold text-text">
                      <span>Grand Total:</span>
                      <span className="tabular-nums text-base font-semibold">{formatCurrency(netTotal)}</span>
                    </div>
                  </div>
                </div>

                {/* Notes & Terms */}
                {(invoice.notes || invoice.terms) && (
                  <div className="mt-6 pt-4 border-t border-border text-[11px] text-muted space-y-1">
                    <span className="font-semibold text-text uppercase tracking-wider text-[10px] block">
                      Terms & Conditions
                    </span>
                    <p className="whitespace-pre-line leading-relaxed">{invoice.notes || invoice.terms}</p>
                  </div>
                )}

                {/* Signatory */}
                <div className="mt-8 pt-4 flex justify-between items-end border-t border-border">
                  <p className="text-[10px] text-faint">
                    This is a computer-generated tax invoice.
                  </p>
                  <div className="text-right">
                    <p className="text-xs text-muted mb-8">
                      For <span className="font-semibold text-text">{business.businessName || 'Business'}</span>
                    </p>
                    <p className="text-xs font-semibold text-text border-t border-border pt-1 px-4 inline-block">
                      Authorised Signatory
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </main>

          {/* ══ SIDE PANEL: Summary, Payment, Activity (1px dividers, no cards) ══ */}
          <aside className="w-full lg:w-[320px] shrink-0 sticky top-6 self-start rounded-xl border border-border bg-surface divide-y divide-border text-xs">
            {/* Section 1: Summary */}
            <div className="p-4 space-y-3">
              <h3 className="text-xs font-semibold text-text uppercase tracking-wider">Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-baseline gap-2">
                  <span className="text-muted">Customer</span>
                  {hasRealCustomerId ? (
                    <Link
                      to={PATHS.APP.customer(customerId)}
                      className="font-medium text-text hover:text-accent hover:underline text-right truncate max-w-[180px]"
                    >
                      {customerName}
                    </Link>
                  ) : (
                    <span className="text-muted text-right truncate max-w-[180px]">
                      {customerName}
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-baseline gap-2">
                  <span className="text-muted">Invoice Date</span>
                  <span className="font-medium text-text tabular-nums">{formatDDMMYYYY(invoice.invoiceDate)}</span>
                </div>
                <div className="flex justify-between items-baseline gap-2">
                  <span className="text-muted">Due Date</span>
                  <span className="font-medium text-text tabular-nums">
                    {invoice.dueDate ? formatDDMMYYYY(invoice.dueDate) : 'Immediate'}
                  </span>
                </div>
                <div className="flex justify-between items-baseline gap-2">
                  <span className="text-muted">Place of Supply</span>
                  <span className="font-medium text-text text-right truncate max-w-[180px]" title={posName}>
                    {posName || '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 2: Payment */}
            <div className="p-4 space-y-3">
              <h3 className="text-xs font-semibold text-text uppercase tracking-wider">Payment</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted">Status</span>
                  <StatusBadge status={invoice.status} />
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-muted">Total</span>
                  <span className="font-semibold text-text tabular-nums">{formatCurrency(netTotal)}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-muted">Paid amount</span>
                  <span
                    className={`tabular-nums ${
                      (invoice.status === 'Paid' ? netTotal : 0) > 0
                        ? 'font-medium text-emerald-400'
                        : 'font-medium text-text'
                    }`}
                  >
                    {formatCurrency(invoice.status === 'Paid' ? netTotal : 0)}
                  </span>
                </div>
                <div className="flex justify-between items-baseline pt-1.5 border-t border-border">
                  <span className="font-medium text-text">Balance due</span>
                  <span
                    className={`font-semibold tabular-nums ${
                      invoice.status === 'Paid' || invoice.status === 'Cancelled'
                        ? 'text-muted'
                        : 'text-amber-400'
                    }`}
                  >
                    {formatCurrency(invoice.status === 'Paid' || invoice.status === 'Cancelled' ? 0 : netTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 3: Activity Timeline */}
            {activityEvents.length > 0 && (
              <div className="p-4 space-y-3">
                <h3 className="text-xs font-semibold text-text uppercase tracking-wider">Activity</h3>
                <div className="relative pl-4 space-y-3 before:absolute before:left-1.5 before:top-1.5 before:bottom-1.5 before:w-px before:bg-border">
                  {activityEvents.map((evt, idx) => (
                    <div key={idx} className="relative space-y-0.5">
                      <span className={`absolute -left-4 top-1 w-2 h-2 rounded-full ${evt.dotClass}`} />
                      <p className="font-medium text-text text-xs leading-none">{evt.label}</p>
                      <p className="text-[11px] text-muted leading-none">{evt.date}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>

        {/* ── 5. Sticky Bottom Bar for Primary Action (< lg) ──────────────── */}
        {primaryActionButton && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 p-3 bg-surface/90 backdrop-blur-md border-t border-border z-20 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center justify-end gap-3 shadow-lg">
            {invoice.status === 'Draft' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onNavigate('edit-invoice', invoice._id || invoice.id)}
                className="h-9 px-3 text-xs"
              >
                <Edit3 className="w-3.5 h-3.5 mr-1" />
                <span>Edit</span>
              </Button>
            )}
            {primaryActionButton}
          </div>
        )}
      </div>

      {/* ── Confirmation Dialogs ────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={confirmState.type === 'issue'}
        title="Issue invoice?"
        description="It will get the next invoice number and can't be edited afterwards."
        confirmLabel="Issue invoice"
        cancelLabel="Cancel"
        loading={confirmState.loading}
        error={confirmState.error}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmState({ type: null, loading: false, error: '' })}
      />

      <ConfirmDialog
        isOpen={confirmState.type === 'mark-paid'}
        title={`Mark invoice ${invoice.invoiceNumber || ''} as paid?`}
        description="This will record the invoice as fully paid."
        confirmLabel="Mark as paid"
        cancelLabel="Cancel"
        loading={confirmState.loading}
        error={confirmState.error}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmState({ type: null, loading: false, error: '' })}
      />

      <ConfirmDialog
        isOpen={confirmState.type === 'mark-unpaid'}
        title={`Mark invoice ${invoice.invoiceNumber || ''} as unpaid?`}
        description="This will revert the status back to Issued."
        confirmLabel="Mark as unpaid"
        cancelLabel="Cancel"
        loading={confirmState.loading}
        error={confirmState.error}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmState({ type: null, loading: false, error: '' })}
      />

      <ConfirmDialog
        isOpen={confirmState.type === 'cancel'}
        title={`Cancel invoice ${invoice.invoiceNumber || ''}?`}
        description="It stays on record but is marked cancelled. This can't be undone."
        confirmLabel="Cancel invoice"
        cancelLabel="Cancel"
        destructive
        loading={confirmState.loading}
        error={confirmState.error}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmState({ type: null, loading: false, error: '' })}
      />

      <ConfirmDialog
        isOpen={confirmState.type === 'delete'}
        title="Delete draft invoice?"
        description="This draft invoice will be permanently removed. This action cannot be undone."
        confirmLabel="Delete draft"
        cancelLabel="Cancel"
        destructive
        loading={confirmState.loading}
        error={confirmState.error}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmState({ type: null, loading: false, error: '' })}
      />

      {/* ── Email Modal ─────────────────────────────────────────────────── */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface text-text rounded-xl shadow-xl border border-border w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-bg/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-accent text-text flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text">Email Tax Invoice</h3>
                  <p className="text-[11px] text-muted font-mono">{invoice.invoiceNumber || 'Draft'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEmailModalOpen(false)}
                className="p-1 text-muted hover:text-text rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendEmail} className="p-5 space-y-4 text-xs">
              {emailFeedback && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                    emailFeedback.type === 'success'
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                      : 'bg-danger/10 border border-danger/20 text-danger'
                  }`}
                >
                  {emailFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span>{emailFeedback.message}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-muted font-medium block">Recipient Email</label>
                <input
                  type="email"
                  required
                  value={emailForm.recipientEmail}
                  onChange={(e) => setEmailForm({ ...emailForm, recipientEmail: e.target.value })}
                  placeholder="customer@example.com"
                  className="w-full h-9 rounded-lg border border-border bg-bg px-3 text-text placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-muted font-medium block">Recipient Name</label>
                <input
                  type="text"
                  value={emailForm.recipientName}
                  onChange={(e) => setEmailForm({ ...emailForm, recipientName: e.target.value })}
                  placeholder="Customer Name"
                  className="w-full h-9 rounded-lg border border-border bg-bg px-3 text-text placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-muted font-medium block">Subject</label>
                <input
                  type="text"
                  required
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                  className="w-full h-9 rounded-lg border border-border bg-bg px-3 text-text placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-muted font-medium block">Message</label>
                <textarea
                  rows={4}
                  value={emailForm.message}
                  onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
                  className="w-full rounded-lg border border-border bg-bg p-3 text-text placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-border">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsEmailModalOpen(false)}
                  disabled={isSendingEmail}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSendingEmail}
                  className="gap-1.5"
                >
                  {isSendingEmail ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending…</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-3.5 h-3.5" />
                      <span>Send Invoice</span>
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
