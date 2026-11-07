/**
 * CustomerDrawer.jsx
 * Right-side drawer for Add / Edit customer.
 *
 * Props:
 *   isOpen         boolean
 *   onClose        () => void
 *   onSave         (formData) => Promise<savedCustomer>   — must return the saved object
 *   initialData    object | null    (null = add new)
 *   prefillName    string | ''      (quick-add from invoice)
 */

import React, {
  useState, useEffect, useRef, useCallback, useId
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { X, ChevronDown, Loader2, AlertCircle, AlertTriangle, Plus, ExternalLink } from 'lucide-react';
import {
  Field, Input, Select, Button, Textarea
} from '../invoice/InvoiceEditorUI';
import { INDIAN_STATES, getStateByCode } from '../../gst/taxRules';
import { validateGSTIN } from '../../gst/validateGSTIN';
import {
  CUSTOMER_TYPES,
  CUSTOMER_TYPE_OPTIONS,
  normalizeCustomerType,
} from '../../utils/customer';
import { useUnsavedChanges } from '../../utils/useUnsavedChanges';
import { customersApi } from '../../api/customers.api';
import { useAppNavigate } from '../../utils/navigation';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMPTY_FORM = () => ({
  name: '',
  customerType: CUSTOMER_TYPES.REGISTERED,   // 'registered' | 'unregistered'
  gstin: '',
  state: '',
  email: '',
  phone: '',
  address: '',
});

// ─── Segmented control (Customer Type) ────────────────────────────────────────
function SegmentedControl({ value, onChange, options }) {
  return (
    <div
      role="radiogroup"
      className="flex h-10 rounded-lg border border-border bg-bg overflow-hidden"
    >
      {options.map(opt => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={[
              'flex-1 flex items-center justify-center text-xs font-medium px-2 transition-colors cursor-pointer whitespace-nowrap',
              active
                ? 'bg-accent text-text shadow-sm'
                : 'text-muted hover:text-text hover:bg-border/50',
            ].join(' ')}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main Drawer ───────────────────────────────────────────────────────────────
export function CustomerDrawer({
  isOpen,
  onClose,
  onSave,
  initialData = null,
  prefillName = '',
}) {
  const queryClient = useQueryClient();
  const appNavigate = useAppNavigate();
  const isEditing = Boolean(initialData);

  const [form,               setForm]              = useState(EMPTY_FORM());
  const [initialBaseline,    setInitialBaseline]   = useState(EMPTY_FORM());
  const { isDirty, resetBaseline }                 = useUnsavedChanges(form, initialBaseline);
  const [confirmingDiscard,  setConfirmingDiscard] = useState(false);

  const [errors,     setErrors]    = useState({});
  const [saving,     setSaving]    = useState(false);
  const [saveError,  setSaveError] = useState('');
  const [gstinValid, setGstinValid]= useState(null); // null | {isValid, message}
  const [gstinDuplicateInfo, setGstinDuplicateInfo] = useState(null); // null | { existingId, existingName, isArchived }
  const [saveWarnings, setSaveWarnings] = useState([]);
  const [restoring,  setRestoring] = useState(false);
  const [showContact, setShowContact] = useState(false);

  const nameRef          = useRef(null);
  const keepEditingBtnRef= useRef(null);
  const drawerRef        = useRef(null);
  const titleId          = useId();

  // ── Populate / reset baseline on open ──────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setConfirmingDiscard(false);
      setGstinDuplicateInfo(null);
      setSaveWarnings([]);
      let f;
      if (initialData) {
        const normalizedType = normalizeCustomerType(
          initialData.customerType || (initialData.gstin ? 'registered' : 'unregistered')
        );
        f = {
          name:         initialData.name         || '',
          customerType: normalizedType,
          gstin:        normalizedType === CUSTOMER_TYPES.REGISTERED ? (initialData.gstin || '') : '',
          state:        initialData.state        || '',
          email:        initialData.email        || '',
          phone:        initialData.phone        || '',
          address:      initialData.address      || '',
        };
        setShowContact(!!(f.email || f.phone));
        if (f.gstin && normalizedType === CUSTOMER_TYPES.REGISTERED) {
          setGstinValid(validateGSTIN(f.gstin));
        } else {
          setGstinValid(null);
        }
      } else {
        f = { ...EMPTY_FORM(), name: prefillName || '' };
        setShowContact(false);
        setGstinValid(null);
      }
      setForm(f);
      setInitialBaseline(f);
      // NOTE: do NOT call resetBaseline here — setInitialBaseline already syncs
      // the baseline via the initialValues watch in useUnsavedChanges, and calling
      // resetBaseline (which depends on `form`) inside this effect creates an
      // infinite update loop.
      setErrors({});
      setSaveError('');
      setSaving(false);
      // Autofocus name
      setTimeout(() => nameRef.current?.focus(), 60);
    }
  }, [isOpen, initialData, prefillName]);  // resetBaseline intentionally omitted

  // ── Close handler with dirty check ─────────────────────────────────────────
  const attemptClose = useCallback(() => {
    if (!isDirty) {
      setConfirmingDiscard(false);
      onClose();
    } else {
      setConfirmingDiscard(true);
    }
  }, [isDirty, onClose]);

  // ── Autofocus "Keep editing" when confirming discard ───────────────────────
  useEffect(() => {
    if (confirmingDiscard) {
      const timer = setTimeout(() => {
        keepEditingBtnRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [confirmingDiscard]);

  // ── ESC key handling ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const onKey = e => {
      if (e.key === 'Escape') {
        if (confirmingDiscard) {
          // Esc while confirming means "Keep editing"
          setConfirmingDiscard(false);
        } else {
          attemptClose();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, confirmingDiscard, attemptClose]);

  // ── Body scroll lock ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = originalOverflow; };
  }, [isOpen]);

  // ── Focus trap ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !drawerRef.current) return;
    const el = drawerRef.current;
    const focusable = () =>
      [...el.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )];

    const onTab = e => {
      if (e.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last  = items[items.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onTab);
    return () => document.removeEventListener('keydown', onTab);
  }, [isOpen]);

  // ── Field setters ──────────────────────────────────────────────────────────
  const set = (field, value) => {
    setForm(p => ({ ...p, [field]: value }));
    setErrors(p => { const c = { ...p }; delete c[field]; return c; });
  };

  // ── Customer type handling ────────────────────────────────────────────────
  const handleCustomerTypeChange = (newType) => {
    setForm(prev => ({
      ...prev,
      customerType: newType,
      gstin: '',
    }));
    setGstinValid(null);
    setErrors(prev => {
      const next = { ...prev };
      delete next.gstin;
      return next;
    });
  };

  // ── GSTIN handling ─────────────────────────────────────────────────────────
  const handleGstinChange = e => {
    const val = e.target.value.toUpperCase().slice(0, 15);
    set('gstin', val);
    setGstinValid(null);
  };

  const handleGstinBlur = () => {
    if (!form.gstin.trim()) { setGstinValid(null); return; }
    const res = validateGSTIN(form.gstin);
    setGstinValid(res);
    if (res.isValid && res.stateCode) {
      const matched = getStateByCode(res.stateCode);
      if (matched && !form.state) {
        set('state', matched.name);
      }
      set('customerType', CUSTOMER_TYPES.REGISTERED);
    }
    if (!res.isValid) {
      setErrors(p => ({ ...p, gstin: res.message }));
    } else {
      setErrors(p => { const c = { ...p }; delete c.gstin; return c; });
    }
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Customer name is required.';
    if (form.customerType === CUSTOMER_TYPES.REGISTERED) {
      if (form.gstin.trim()) {
        const res = validateGSTIN(form.gstin);
        if (!res.isValid) errs.gstin = res.message;
      }
    }
    setErrors(errs);
    if (Object.keys(errs).length) {
      const firstKey = Object.keys(errs)[0];
      const el = drawerRef.current?.querySelector(`[id="${firstKey}"], [name="${firstKey}"]`);
      el?.focus();
      return false;
    }
    return true;
  };

  // ── Restore duplicate handler ─────────────────────────────────────────────
  const handleRestoreDuplicate = async () => {
    if (!gstinDuplicateInfo?.existingId) return;
    try {
      setRestoring(true);
      await customersApi.unarchive(gstinDuplicateInfo.existingId);
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      onClose();
      appNavigate('customer-details', gstinDuplicateInfo.existingId);
    } catch (err) {
      setSaveError(err.message || 'Failed to restore customer.');
    } finally {
      setRestoring(false);
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async e => {
    e.preventDefault();
    if (!validate()) return;
    setSaveError('');
    setGstinDuplicateInfo(null);
    setSaveWarnings([]);
    try {
      setSaving(true);
      const payload = {
        name:         form.name.trim(),
        customerType: form.customerType === CUSTOMER_TYPES.REGISTERED ? 'registered' : 'unregistered',
        gstin:        form.customerType === CUSTOMER_TYPES.REGISTERED ? form.gstin.trim() : '',
        state:        form.state,
        email:        form.email.trim(),
        phone:        form.phone.trim(),
        address:      form.address.trim(),
      };
      const saved = await onSave(payload);
      resetBaseline(form);
      if (saved?.meta?.warnings?.length) {
        setSaveWarnings(saved.meta.warnings);
      }
      return saved;
    } catch (err) {
      if (err.code === 'DUPLICATE_GSTIN') {
        const details = err.details || err.fields || {};
        setGstinDuplicateInfo(details);
        setSaveError('');
      } else {
        if (err.fields && typeof err.fields === 'object') {
          setErrors(prev => ({ ...prev, ...err.fields }));
        }
        setSaveError(err.message || 'Failed to save customer. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop — on dirty form, clicking triggers inline confirm rather than closing */}
      <div
        className="fixed inset-0 z-40 bg-black/50 transition-opacity"
        aria-hidden="true"
        onClick={attemptClose}
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed inset-y-0 right-0 z-50 flex flex-col w-full max-w-[480px] bg-surface shadow-2xl transition-transform duration-300 ease-in-out translate-x-0"
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 id={titleId} className="text-[15px] font-semibold text-text">
            {isEditing ? 'Edit customer' : 'Add customer'}
          </h2>
          <button
            type="button"
            onClick={attemptClose}
            aria-label="Close drawer"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-text hover:bg-border transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Scrollable body ─────────────────────────────────────────────── */}
        <form
          id="customer-drawer-form"
          onSubmit={handleSubmit}
          noValidate
          className="flex-1 overflow-y-auto px-5 py-5 space-y-6"
        >

          {/* Save error banner */}
          {saveError && (
            <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{saveError}</span>
            </div>
          )}

          {/* Non-blocking warnings note after saving */}
          {saveWarnings.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-xs text-text">
                <p className="font-semibold text-warning">Note</p>
                {saveWarnings.map((w, idx) => (
                  <p key={idx}>{w.message || w}</p>
                ))}
              </div>
            </div>
          )}

          {/* ── Section: Basics ─────────────────────────────────────────── */}
          <div className="space-y-4">
            <p className="text-[13px] font-semibold text-text tracking-tight">Basics</p>

            {/* Name */}
            <Field label="Customer name" htmlFor="name" error={errors.name}>
              <Input
                ref={nameRef}
                id="name"
                name="name"
                type="text"
                value={form.name}
                placeholder="Customer name"
                autoComplete="off"
                onChange={e => set('name', e.target.value)}
              />
            </Field>

            {/* Customer type */}
            <div className="flex flex-col gap-1">
              <label className="text-[13px] font-medium text-muted leading-none">
                Customer type
              </label>
              <SegmentedControl
                value={form.customerType}
                onChange={handleCustomerTypeChange}
                options={CUSTOMER_TYPE_OPTIONS}
              />
              <p className="text-xs text-muted mt-1 leading-normal">
                {form.customerType === CUSTOMER_TYPES.REGISTERED
                  ? 'Has a GSTIN and can claim tax credit.'
                  : 'No GSTIN. Individuals and unregistered businesses.'}
              </p>
            </div>

            {/* GSTIN — shown only for Registered */}
            {form.customerType === CUSTOMER_TYPES.REGISTERED && (
              <Field
                label="GSTIN"
                htmlFor="gstin"
                optional
                error={errors.gstin}
                helper={
                  !errors.gstin && gstinValid?.isValid
                    ? '✓ Format valid'
                    : !errors.gstin
                    ? 'Auto-detects state from GSTIN'
                    : undefined
                }
              >
                <Input
                  id="gstin"
                  name="gstin"
                  type="text"
                  value={form.gstin}
                  placeholder="27AAAAA0000A1Z5"
                  maxLength={15}
                  className={
                    gstinValid?.isValid
                      ? 'border-emerald-500/60'
                      : errors.gstin
                      ? 'border-danger'
                      : ''
                  }
                  onChange={handleGstinChange}
                  onBlur={handleGstinBlur}
                />
                {gstinDuplicateInfo && (
                  <div className="mt-2.5 p-3 rounded-lg border border-warning/30 bg-warning/10 text-xs text-text space-y-1.5">
                    <div className="flex items-center gap-1.5 font-medium text-warning">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>A customer with this GSTIN already exists.</span>
                    </div>
                    <div className="flex items-center gap-3 pt-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          appNavigate('customer-details', gstinDuplicateInfo.existingId);
                        }}
                        className="inline-flex items-center gap-1 text-accent hover:underline font-medium cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Open {gstinDuplicateInfo.existingName || 'customer'}</span>
                      </button>
                      {gstinDuplicateInfo.isArchived && (
                        <button
                          type="button"
                          onClick={handleRestoreDuplicate}
                          disabled={restoring}
                          className="text-warning hover:underline font-medium cursor-pointer disabled:opacity-50"
                        >
                          {restoring ? 'Restoring…' : 'Restore'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </Field>
            )}

            {/* State / Place of supply */}
            <Field label="State / Place of supply" htmlFor="state" optional error={errors.state}>
              <Select
                id="state"
                name="state"
                value={form.state}
                onChange={e => set('state', e.target.value)}
                className={!form.state ? 'text-faint' : 'text-text'}
              >
                <option value="" className="text-faint">Select state</option>
                {INDIAN_STATES.map(s => (
                  <option key={s.code} value={s.name} className="text-text">
                    {s.code} — {s.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {/* ── Section: Contact (collapsible) ──────────────────────────── */}
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setShowContact(p => !p)}
              className="flex items-center gap-1.5 text-xs font-medium text-accent hover:underline cursor-pointer"
            >
              {showContact ? (
                <>
                  <ChevronDown className="w-3.5 h-3.5 rotate-180 transition-transform" />
                  Hide contact details
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  Add contact details
                </>
              )}
            </button>

            {showContact && (
              <div className="space-y-4">
                <p className="text-[13px] font-semibold text-text tracking-tight">Contact <span className="text-[12px] font-normal text-faint">(optional)</span></p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Email */}
                  <Field label="Email" htmlFor="email" optional error={errors.email}>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={form.email}
                      placeholder="billing@company.com"
                      onChange={e => set('email', e.target.value)}
                    />
                  </Field>

                  {/* Phone with +91 prefix */}
                  <Field label="Phone" htmlFor="phone" optional error={errors.phone}>
                    <div className="flex h-10 rounded-lg border border-border bg-surface overflow-hidden focus-within:ring-2 focus-within:ring-accent focus-within:border-accent">
                      <span className="flex items-center px-3 text-sm font-medium text-muted border-r border-border bg-bg shrink-0 select-none">
                        +91
                      </span>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        value={form.phone}
                        placeholder="98765 43210"
                        onChange={e => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                          set('phone', digits);
                        }}
                        className="flex-1 h-full px-3 text-sm font-normal text-text bg-transparent placeholder:text-faint focus:outline-none"
                      />
                    </div>
                  </Field>
                </div>
              </div>
            )}
          </div>

          {/* ── Section: Billing address (collapsible) ──────────────────── */}
          <div className="space-y-4">
            <p className="text-[13px] font-semibold text-text tracking-tight">Billing address <span className="text-[12px] font-normal text-faint">(optional)</span></p>
            <Textarea
              id="address"
              name="address"
              rows={3}
              value={form.address}
              placeholder="Street address, City, State, PIN code"
              onChange={e => set('address', e.target.value)}
            />
          </div>

        </form>

        {/* ── Sticky footer: Normal vs Inline Confirm ────────────────────────── */}
        {confirmingDiscard ? (
          <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-3.5 border-t border-border bg-surface">
            <span className="text-xs font-semibold text-text">
              Discard changes?
            </span>
            <div className="flex items-center gap-2">
              <Button
                ref={keepEditingBtnRef}
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setConfirmingDiscard(false)}
                className="h-8 px-3 text-xs"
              >
                Keep editing
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => {
                  setConfirmingDiscard(false);
                  onClose();
                }}
                className="h-8 px-3 text-xs"
              >
                Discard
              </Button>
            </div>
          </div>
        ) : (
          <div className="shrink-0 flex items-center justify-end gap-3 px-5 py-4 border-t border-border bg-surface">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={attemptClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="customer-drawer-form"
              variant="primary"
              size="md"
              disabled={saving}
              className="min-w-[130px]"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : isEditing ? 'Update customer' : 'Save customer'}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

export default CustomerDrawer;
