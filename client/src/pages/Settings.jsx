/**
 * Settings.jsx — Business Profile, Invoice Numbering, and Payment Settings
 *
 * Design System:
 *  - Colors: strictly semantic tokens (bg, surface, border, text, muted, faint, accent, danger)
 *  - Layout: max-w-screen-xl px-4 sm:px-6 py-6 font-sans
 *  - Header: "Settings" (20px/600) + 14px muted subtitle
 *  - Form sections: 32px spacing, 1px dividers. From lg: 260px left column (title + description), max-w-xl right column
 *  - Single unified save state with useUnsavedChanges, sticky bottom bar, and navigation blocking
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react';

import { useAuth } from '@/features/auth';
import { businessApi } from '../api/business.api';
import { invoicesApi } from '../api/invoices.api';
import { INDIAN_STATES, getStateByCode } from '../gst/taxRules';
import { validateGSTIN } from '../gst/validateGSTIN';
import { useUnsavedChanges, useNavigationBlocker } from '../utils/useUnsavedChanges';
import { Field, Input, Select, Textarea, Button } from '../components/invoice/InvoiceEditorUI';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { PageHeader } from '../components/layout/PageHeader';

const EMPTY_FORM = () => ({
  businessName: '',
  gstin: '',
  pan: '',
  state: '',
  email: '',
  phone: '',
  address: '',
  invoicePrefix: 'INV/26-27/',
  startingNumber: 1,
  accountName: '',
  accountNumber: '',
  bankName: '',
  ifscCode: '',
  branch: '',
  upiId: '',
  defaultNotes: '',
  defaultTerms: '',
});

export function Settings() {
  const { isAuthenticated } = useAuth();

  const [form, setForm] = useState(EMPTY_FORM());
  const [initialBaseline, setInitialBaseline] = useState(EMPTY_FORM());
  const { isDirty, resetBaseline } = useUnsavedChanges(form, initialBaseline);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [errors, setErrors] = useState({});

  // Invoices issued state (locks startingNumber if > 0)
  const [invoicesIssued, setInvoicesIssued] = useState(false);

  // In-app navigation blocker state
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);
  const pendingNavigationRef = useRef(null);

  // Field refs for auto-focusing on validation failure
  const businessNameRef = useRef(null);
  const gstinRef = useRef(null);
  const panRef = useRef(null);
  const stateRef = useRef(null);
  const emailRef = useRef(null);
  const phoneRef = useRef(null);
  const invoicePrefixRef = useRef(null);
  const startingNumberRef = useRef(null);
  const accountNumberRef = useRef(null);
  const ifscCodeRef = useRef(null);
  const upiIdRef = useRef(null);

  const fieldRefs = useMemo(
    () => ({
      businessName: businessNameRef,
      gstin: gstinRef,
      pan: panRef,
      state: stateRef,
      email: emailRef,
      phone: phoneRef,
      invoicePrefix: invoicePrefixRef,
      startingNumber: startingNumberRef,
      accountNumber: accountNumberRef,
      ifscCode: ifscCodeRef,
      upiId: upiIdRef,
    }),
    []
  );

  const set = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ── 1. Load data from server ───────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);

      const [bizRes, invRes] = await Promise.all([
        businessApi.get(),
        invoicesApi.list({ limit: 1 }),
      ]);

      const biz = bizRes?.data || null;
      const invTotal = invRes?.meta?.total ?? invRes?.data?.total ?? (Array.isArray(invRes?.data) ? invRes.data.length : (invRes?.data?.invoices?.length || 0));
      setInvoicesIssued(invTotal > 0);

      const loaded = {
        businessName: biz?.businessName || '',
        gstin: biz?.gstin || '',
        pan: biz?.pan || '',
        state: biz?.state || '',
        email: biz?.email || '',
        phone: biz?.phone || '',
        address: biz?.address || '',
        invoicePrefix: biz?.invoiceSettings?.invoicePrefix || 'INV/26-27/',
        startingNumber: biz?.invoiceSettings?.startingNumber || 1,
        accountName: biz?.bankDetails?.accountName || '',
        accountNumber: biz?.bankDetails?.accountNumber || '',
        bankName: biz?.bankDetails?.bankName || '',
        ifscCode: biz?.bankDetails?.ifscCode || '',
        branch: biz?.bankDetails?.branch || '',
        upiId: biz?.bankDetails?.upiId || '',
        defaultNotes: biz?.invoiceSettings?.defaultNotes || '',
        defaultTerms: biz?.invoiceSettings?.defaultTerms || '',
      };

      setForm(loaded);
      setInitialBaseline(loaded);
      setErrors({});
      setSaveError('');
    } catch (err) {
      console.error('Failed to load settings:', err);
      setLoadError(err.message || 'Failed to load business settings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, isAuthenticated]);

  // ── 2. Block navigation and tab close while dirty ──────────────────────────
  useNavigationBlocker(isDirty, (retry) => {
    pendingNavigationRef.current = retry;
    setConfirmLeaveOpen(true);
  });

  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // ── 3. GSTIN Auto-fill logic on change / blur ─────────────────────────────
  const handleGstinChange = (e) => {
    const val = e.target.value.toUpperCase().slice(0, 15);
    set('gstin', val);
  };

  const handleGstinBlur = () => {
    const val = form.gstin.trim();
    if (!val) {
      setErrors((prev) => {
        const { gstin: _, ...rest } = prev;
        return rest;
      });
      return;
    }

    const res = validateGSTIN(val);
    if (!res.isValid) {
      setErrors((prev) => ({ ...prev, gstin: res.message || 'Invalid GSTIN format.' }));
    } else {
      setErrors((prev) => {
        const { gstin: _, ...rest } = prev;
        return rest;
      });
      // Auto-select State from first 2 digits
      if (res.stateCode) {
        const matched = getStateByCode(res.stateCode);
        if (matched) {
          set('state', matched.name);
        }
      }
      // If PAN is empty, prefill characters 3 to 12
      if (!form.pan.trim() && val.length >= 12) {
        const panPart = val.slice(2, 12);
        set('pan', panPart);
      }
    }
  };

  // ── 4. Field validation ───────────────────────────────────────────────────
  const validate = () => {
    const errs = {};

    // Business Name (required)
    if (!form.businessName.trim()) {
      errs.businessName = 'Business name is required.';
    }

    // State (required)
    if (!form.state.trim()) {
      errs.state = 'State is required.';
    }

    // GSTIN (format validation if entered)
    if (form.gstin.trim()) {
      const gstinVal = validateGSTIN(form.gstin.trim());
      if (!gstinVal.isValid) {
        errs.gstin = gstinVal.message || 'Invalid GSTIN format (15 characters).';
      }
    }

    // PAN (format validation if entered)
    if (form.pan.trim()) {
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.pan.trim())) {
        errs.pan = 'Invalid PAN format (e.g. AABCS1234F).';
      }
    }

    // Email (format validation if entered)
    if (form.email.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        errs.email = 'Enter a valid email address.';
      }
    }

    // Phone (format validation if entered: exactly 10 digits)
    if (form.phone.trim()) {
      if (!/^\d{10}$/.test(form.phone.trim())) {
        errs.phone = 'Phone number must be exactly 10 digits.';
      }
    }

    // Invoice Prefix
    if (!form.invoicePrefix.trim()) {
      errs.invoicePrefix = 'Invoice prefix is required.';
    } else if (!/^[a-zA-Z0-9\/-]+$/.test(form.invoicePrefix.trim())) {
      errs.invoicePrefix = 'Only letters, digits, hyphen, and slash allowed.';
    }

    // Starting number (positive integer)
    const startNum = parseInt(form.startingNumber, 10);
    if (!startNum || startNum < 1 || isNaN(startNum)) {
      errs.startingNumber = 'Must be a positive integer.';
    }

    // Full invoice number max 16 characters GST limit
    const prefixLen = form.invoicePrefix.trim().length;
    const numDigits = Math.max(3, String(startNum || 1).length);
    if (prefixLen + numDigits > 16) {
      errs.invoicePrefix = 'Full invoice number exceeds 16 characters (GST rule).';
    }

    // Bank Account Number (if entered: 9 to 18 digits)
    if (form.accountNumber.trim()) {
      if (!/^\d{9,18}$/.test(form.accountNumber.trim())) {
        errs.accountNumber = 'Account number must be 9 to 18 digits.';
      }
    }

    // IFSC Code (if entered: uppercase /^[A-Z]{4}0[A-Z0-9]{6}$/)
    if (form.ifscCode.trim()) {
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifscCode.trim())) {
        errs.ifscCode = 'Invalid IFSC code (e.g. HDFC0001234).';
      }
    }

    // UPI ID (if entered: name@handle format)
    if (form.upiId.trim()) {
      if (!/^[a-zA-Z0-9.\-_]{2,49}@[a-zA-Z]{2,}$/.test(form.upiId.trim())) {
        errs.upiId = 'Enter a valid UPI ID (e.g. name@upi).';
      }
    }

    return errs;
  };

  // ── 5. Save changes ───────────────────────────────────────────────────────
  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaveError('');

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      // Focus first invalid field
      const firstKey = Object.keys(validationErrors)[0];
      const targetRef = fieldRefs[firstKey];
      if (targetRef?.current) {
        targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetRef.current.focus();
      }
      return;
    }

    setErrors({});

    try {
      setSaving(true);
      const payload = {
        businessName: form.businessName.trim(),
        gstin: form.gstin.trim(),
        pan: form.pan.trim(),
        address: form.address.trim(),
        state: form.state.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        invoiceSettings: {
          invoicePrefix: form.invoicePrefix.trim(),
          startingNumber: parseInt(form.startingNumber, 10) || 1,
          defaultNotes: form.defaultNotes.trim(),
          defaultTerms: form.defaultTerms.trim(),
        },
        bankDetails: {
          accountName: form.accountName.trim(),
          accountNumber: form.accountNumber.trim(),
          bankName: form.bankName.trim(),
          ifscCode: form.ifscCode.trim(),
          branch: form.branch.trim(),
          upiId: form.upiId.trim(),
        },
      };

      await businessApi.save(payload);

      // Reset baseline to current saved form
      resetBaseline(form);

      // Show "Saved" feedback for 2 seconds
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setSaveError(err.message || 'Unable to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── 6. Discard changes ────────────────────────────────────────────────────
  const handleDiscard = () => {
    setForm(initialBaseline);
    setErrors({});
    setSaveError('');
  };

  // Live invoice number preview (formatted with 3-digit zero-padding)
  const nextInvoicePreview = useMemo(() => {
    const prefix = form.invoicePrefix || '';
    const num = Math.max(1, parseInt(form.startingNumber, 10) || 1);
    const padded = String(num).padStart(3, '0');
    return `${prefix}${padded}`;
  }, [form.invoicePrefix, form.startingNumber]);

  // ── Skeleton loading state ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="w-full bg-bg text-text font-sans flex flex-col min-h-full">
        <div className="mx-auto max-w-screen-xl w-full px-4 sm:px-6 py-6 space-y-8 animate-pulse">
          {/* Header skeleton */}
          <div className="space-y-2">
            <div className="h-6 bg-border rounded w-32" />
            <div className="h-4 bg-border rounded w-80 max-w-full" />
          </div>

          {/* Section 1 skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 lg:gap-12 pt-6">
            <div className="space-y-2">
              <div className="h-4 bg-border rounded w-36" />
              <div className="h-3 bg-border rounded w-48" />
            </div>
            <div className="max-w-xl space-y-4">
              <div className="h-10 bg-border rounded-lg" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-10 bg-border rounded-lg" />
                <div className="h-10 bg-border rounded-lg" />
              </div>
              <div className="h-10 bg-border rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-bg text-text font-sans flex flex-col min-h-full">
      <div className="mx-auto max-w-screen-xl w-full px-4 sm:px-6 py-6 space-y-8 pb-32">

        {/* ── Page Header ──────────────────────────────────────────────────── */}
        <PageHeader
          title="Settings"
          description="Your business details, invoice numbering and payment instructions."
        />

        {/* ── Error Banner (Load / Save Error) ─────────────────────────────── */}
        {(loadError || saveError) && (
          <div className="flex items-center justify-between rounded-lg border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm gap-3">
            <div className="flex items-center gap-2 text-danger min-w-0">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="truncate">{loadError || saveError}</span>
            </div>
            {loadError && (
              <Button variant="secondary" size="sm" onClick={loadData} className="shrink-0">
                Retry
              </Button>
            )}
          </div>
        )}

        {/* ── Section 1: Business Profile ──────────────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 lg:gap-12 items-start">
          <div className="space-y-1">
            <h2 className="text-[15px] font-semibold text-text tracking-tight">
              Business profile
            </h2>
            <p className="text-[13px] text-muted leading-relaxed">
              This information appears at the top of all issued GST tax invoices.
            </p>
          </div>

          <div className="max-w-xl w-full space-y-4">
            {/* Business name */}
            <Field label="Business name" htmlFor="businessName" error={errors.businessName}>
              <Input
                ref={businessNameRef}
                id="businessName"
                name="businessName"
                value={form.businessName}
                placeholder="Business name"
                error={errors.businessName}
                onChange={(e) => set('businessName', e.target.value)}
                onBlur={() => {
                  if (!form.businessName.trim()) {
                    setErrors((prev) => ({ ...prev, businessName: 'Business name is required.' }));
                  } else {
                    setErrors((prev) => {
                      const { businessName: _, ...rest } = prev;
                      return rest;
                    });
                  }
                }}
              />
            </Field>

            {/* GSTIN & PAN side-by-side from sm */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="GSTIN" htmlFor="gstin" optional error={errors.gstin}>
                <Input
                  ref={gstinRef}
                  id="gstin"
                  name="gstin"
                  value={form.gstin}
                  maxLength={15}
                  placeholder="GSTIN"
                  error={errors.gstin}
                  onChange={handleGstinChange}
                  onBlur={handleGstinBlur}
                />
              </Field>

              <Field label="PAN" htmlFor="pan" optional error={errors.pan}>
                <Input
                  ref={panRef}
                  id="pan"
                  name="pan"
                  value={form.pan}
                  maxLength={10}
                  placeholder="PAN"
                  error={errors.pan}
                  onChange={(e) => set('pan', e.target.value.toUpperCase().slice(0, 10))}
                  onBlur={() => {
                    const val = form.pan.trim();
                    if (val && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(val)) {
                      setErrors((prev) => ({ ...prev, pan: 'Invalid PAN format.' }));
                    } else {
                      setErrors((prev) => {
                        const { pan: _, ...rest } = prev;
                        return rest;
                      });
                    }
                  }}
                />
              </Field>
            </div>

            {/* State (required) */}
            <Field
              label="State"
              htmlFor="state"
              error={errors.state}
              helper="Used to decide CGST + SGST or IGST"
            >
              <Select
                ref={stateRef}
                id="state"
                name="state"
                value={form.state}
                error={errors.state}
                onChange={(e) => set('state', e.target.value)}
                onBlur={() => {
                  if (!form.state.trim()) {
                    setErrors((prev) => ({ ...prev, state: 'State is required.' }));
                  } else {
                    setErrors((prev) => {
                      const { state: _, ...rest } = prev;
                      return rest;
                    });
                  }
                }}
              >
                <option value="">Select state</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s.code} value={s.name}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </Select>
            </Field>

            {/* Email & Phone side-by-side from sm */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Email" htmlFor="email" optional error={errors.email}>
                <Input
                  ref={emailRef}
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  placeholder="name@example.com"
                  error={errors.email}
                  onChange={(e) => set('email', e.target.value)}
                  onBlur={() => {
                    const val = form.email.trim();
                    if (val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
                      setErrors((prev) => ({ ...prev, email: 'Enter a valid email address.' }));
                    } else {
                      setErrors((prev) => {
                        const { email: _, ...rest } = prev;
                        return rest;
                      });
                    }
                  }}
                />
              </Field>

              <Field label="Phone" htmlFor="phone" optional error={errors.phone}>
                <div
                  className={`flex h-10 rounded-lg border ${
                    errors.phone ? 'border-danger' : 'border-border'
                  } bg-surface overflow-hidden focus-within:ring-2 focus-within:ring-accent focus-within:border-accent`}
                >
                  <span className="flex items-center px-3 text-sm font-medium text-muted border-r border-border bg-bg shrink-0 select-none">
                    +91
                  </span>
                  <input
                    ref={phoneRef}
                    id="phone"
                    name="phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={form.phone}
                    placeholder="9876543210"
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                      set('phone', digits);
                    }}
                    onBlur={() => {
                      const val = form.phone.trim();
                      if (val && !/^\d{10}$/.test(val)) {
                        setErrors((prev) => ({
                          ...prev,
                          phone: 'Phone number must be exactly 10 digits.',
                        }));
                      } else {
                        setErrors((prev) => {
                          const { phone: _, ...rest } = prev;
                          return rest;
                        });
                      }
                    }}
                    className="flex-1 h-full px-3 text-sm font-normal text-text bg-transparent placeholder:text-faint focus:outline-none"
                  />
                </div>
              </Field>
            </div>

            {/* Address */}
            <Field label="Address" htmlFor="address" optional>
              <Textarea
                id="address"
                name="address"
                rows={3}
                value={form.address}
                placeholder="Street address, City, PIN code"
                onChange={(e) => set('address', e.target.value)}
              />
            </Field>
          </div>
        </section>

        {/* ── 1px Divider ─────────────────────────────────────────────────── */}
        <div className="border-t border-border" />

        {/* ── Section 2: Invoice Numbering ─────────────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 lg:gap-12 items-start">
          <div className="space-y-1">
            <h2 className="text-[15px] font-semibold text-text tracking-tight">
              Invoice numbering
            </h2>
            <p className="text-[13px] text-muted leading-relaxed">
              Series prefix and sequence numbering for your tax invoices.
            </p>
          </div>

          <div className="max-w-xl w-full space-y-4">
            {/* Invoice prefix and Starting number side-by-side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Invoice prefix"
                htmlFor="invoicePrefix"
                error={errors.invoicePrefix}
                helper="Update the year part when a new financial year starts."
              >
                <Input
                  ref={invoicePrefixRef}
                  id="invoicePrefix"
                  name="invoicePrefix"
                  value={form.invoicePrefix}
                  placeholder="INV/26-27/"
                  error={errors.invoicePrefix}
                  onChange={(e) => set('invoicePrefix', e.target.value)}
                />
              </Field>

              <Field
                label="Starting number"
                htmlFor="startingNumber"
                error={errors.startingNumber}
              >
                <div title={invoicesIssued ? "Can't be changed after invoices are issued" : undefined}>
                  <Input
                    ref={startingNumberRef}
                    id="startingNumber"
                    name="startingNumber"
                    type="number"
                    min={1}
                    value={form.startingNumber}
                    placeholder="1"
                    readOnly={invoicesIssued}
                    disabled={invoicesIssued}
                    error={errors.startingNumber}
                    onChange={(e) => set('startingNumber', e.target.value)}
                    className={invoicesIssued ? 'opacity-60 cursor-not-allowed' : ''}
                  />
                </div>
              </Field>
            </div>

            {/* Live preview line */}
            <div className="space-y-1">
              <p className="text-xs text-muted">
                Next invoice number:{' '}
                <span className="font-semibold text-text tabular-nums font-sans">
                  {nextInvoicePreview}
                </span>
              </p>
              {invoicesIssued && (
                <p className="text-[11px] text-faint">
                  Changing the prefix affects only new invoices.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ── 1px Divider ─────────────────────────────────────────────────── */}
        <div className="border-t border-border" />

        {/* ── Section 3: Bank & Payment Details (Optional) ─────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 lg:gap-12 items-start">
          <div className="space-y-1">
            <h2 className="text-[15px] font-semibold text-text tracking-tight">
              Bank and payment details
            </h2>
            <p className="text-[13px] text-muted leading-relaxed">
              Shown on invoices so customers know where to pay. Optional.
            </p>
          </div>

          <div className="max-w-xl w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Account holder name */}
              <Field label="Account holder name" htmlFor="accountName">
                <Input
                  id="accountName"
                  name="accountName"
                  value={form.accountName}
                  placeholder="Account holder name"
                  onChange={(e) => set('accountName', e.target.value)}
                />
              </Field>

              {/* Bank name */}
              <Field label="Bank name" htmlFor="bankName">
                <Input
                  id="bankName"
                  name="bankName"
                  value={form.bankName}
                  placeholder="Bank name"
                  onChange={(e) => set('bankName', e.target.value)}
                />
              </Field>

              {/* Account number (digits only 9-18) */}
              <Field
                label="Account number"
                htmlFor="accountNumber"
                error={errors.accountNumber}
              >
                <Input
                  ref={accountNumberRef}
                  id="accountNumber"
                  name="accountNumber"
                  type="text"
                  inputMode="numeric"
                  value={form.accountNumber}
                  placeholder="Account number"
                  error={errors.accountNumber}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 18);
                    set('accountNumber', digits);
                  }}
                  onBlur={() => {
                    const val = form.accountNumber.trim();
                    if (val && !/^\d{9,18}$/.test(val)) {
                      setErrors((prev) => ({
                        ...prev,
                        accountNumber: 'Account number must be 9 to 18 digits.',
                      }));
                    } else {
                      setErrors((prev) => {
                        const { accountNumber: _, ...rest } = prev;
                        return rest;
                      });
                    }
                  }}
                />
              </Field>

              {/* IFSC code */}
              <Field label="IFSC code" htmlFor="ifscCode" error={errors.ifscCode}>
                <Input
                  ref={ifscCodeRef}
                  id="ifscCode"
                  name="ifscCode"
                  value={form.ifscCode}
                  placeholder="IFSC code"
                  maxLength={11}
                  error={errors.ifscCode}
                  onChange={(e) => set('ifscCode', e.target.value.toUpperCase().slice(0, 11))}
                  onBlur={() => {
                    const val = form.ifscCode.trim();
                    if (val && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(val)) {
                      setErrors((prev) => ({
                        ...prev,
                        ifscCode: 'Invalid IFSC code (e.g. HDFC0001234).',
                      }));
                    } else {
                      setErrors((prev) => {
                        const { ifscCode: _, ...rest } = prev;
                        return rest;
                      });
                    }
                  }}
                />
              </Field>

              {/* Branch */}
              <Field label="Branch" htmlFor="branch">
                <Input
                  id="branch"
                  name="branch"
                  value={form.branch}
                  placeholder="Branch name"
                  onChange={(e) => set('branch', e.target.value)}
                />
              </Field>

              {/* UPI ID */}
              <Field label="UPI ID" htmlFor="upiId" error={errors.upiId}>
                <Input
                  ref={upiIdRef}
                  id="upiId"
                  name="upiId"
                  value={form.upiId}
                  placeholder="name@handle"
                  error={errors.upiId}
                  onChange={(e) => set('upiId', e.target.value)}
                  onBlur={() => {
                    const val = form.upiId.trim();
                    if (val && !/^[a-zA-Z0-9.\-_]{2,49}@[a-zA-Z]{2,}$/.test(val)) {
                      setErrors((prev) => ({
                        ...prev,
                        upiId: 'Enter a valid UPI ID (e.g. name@upi).',
                      }));
                    } else {
                      setErrors((prev) => {
                        const { upiId: _, ...rest } = prev;
                        return rest;
                      });
                    }
                  }}
                />
              </Field>
            </div>
          </div>
        </section>

        {/* ── 1px Divider ─────────────────────────────────────────────────── */}
        <div className="border-t border-border" />

        {/* ── Section 4: Invoice Defaults (Optional) ───────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 lg:gap-12 items-start">
          <div className="space-y-1">
            <h2 className="text-[15px] font-semibold text-text tracking-tight">
              Invoice defaults
            </h2>
            <p className="text-[13px] text-muted leading-relaxed">
              Pre-filled on every new invoice. You can edit them per invoice. Optional.
            </p>
          </div>

          <div className="max-w-xl w-full space-y-4">
            <Field label="Default customer notes" htmlFor="defaultNotes">
              <Textarea
                id="defaultNotes"
                name="defaultNotes"
                rows={3}
                value={form.defaultNotes}
                placeholder="Notes to appear on invoices"
                onChange={(e) => set('defaultNotes', e.target.value)}
              />
            </Field>

            <Field label="Default terms & conditions" htmlFor="defaultTerms">
              <Textarea
                id="defaultTerms"
                name="defaultTerms"
                rows={3}
                value={form.defaultTerms}
                placeholder="Payment terms, late fee policy, etc."
                onChange={(e) => set('defaultTerms', e.target.value)}
              />
            </Field>
          </div>
        </section>

      </div>

      {/* ── Sticky Bottom Save Bar (Visible only when dirty or just saved) ─── */}
      {(isDirty || justSaved) && (
        <div className="sticky bottom-0 z-30 w-full border-t border-border bg-bg/95 backdrop-blur-md px-4 sm:px-6 py-3.5 shadow-lg">
          <div className="mx-auto max-w-screen-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {justSaved ? (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                  <Check className="w-4 h-4" />
                  <span>Saved</span>
                </div>
              ) : (
                <span className="text-xs font-medium text-muted">Unsaved changes</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleDiscard}
                disabled={saving}
                className="h-9 px-3 text-xs"
              >
                Discard
              </Button>

              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="h-9 px-4 text-xs min-w-[110px]"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving…</span>
                  </>
                ) : (
                  <span>Save changes</span>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── In-App Leave Confirmation Dialog ───────────────────────────────── */}
      <ConfirmDialog
        isOpen={confirmLeaveOpen}
        title="Leave without saving?"
        description="You have unsaved changes that will be lost if you leave this page."
        confirmLabel="Leave"
        cancelLabel="Keep editing"
        destructive
        onConfirm={() => {
          setConfirmLeaveOpen(false);
          pendingNavigationRef.current?.();
        }}
        onCancel={() => {
          setConfirmLeaveOpen(false);
          pendingNavigationRef.current = null;
        }}
      />
    </div>
  );
}

export default Settings;
