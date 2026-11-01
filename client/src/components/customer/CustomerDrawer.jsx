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
import { X, ChevronDown, Check, Loader2, AlertCircle, Plus } from 'lucide-react';
import {
  Field, Input, Select, Button, Textarea
} from '../invoice/InvoiceEditorUI';
import { INDIAN_STATES, getStateByCode } from '../../gst/taxRules';
import { validateGSTIN } from '../../gst/validateGSTIN';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMPTY_FORM = () => ({
  name: '',
  customerType: 'B2B',   // 'B2B' | 'B2C' | 'Unregistered'
  gstin: '',
  state: '',
  email: '',
  phone: '',
  address: '',
});

/** Returns true if any field has user input */
function isDirty(form) {
  return Object.values(form).some(v => String(v).trim().length > 0);
}

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

// ─── Customer Type options ─────────────────────────────────────────────────────
const CUSTOMER_TYPE_OPTIONS = [
  { value: 'B2B',         label: 'Registered' },
  { value: 'B2C',         label: 'Consumer'   },
  { value: 'Unregistered', label: 'Unregistered' },
];

// ─── Main Drawer ───────────────────────────────────────────────────────────────
export function CustomerDrawer({
  isOpen,
  onClose,
  onSave,
  initialData = null,
  prefillName = '',
}) {
  const isEditing = Boolean(initialData);

  const [form,       setForm]      = useState(EMPTY_FORM());
  const [errors,     setErrors]    = useState({});
  const [saving,     setSaving]    = useState(false);
  const [saveError,  setSaveError] = useState('');
  const [gstinValid, setGstinValid]= useState(null); // null | {isValid, message}
  const [showContact, setShowContact] = useState(false);

  const nameRef    = useRef(null);
  const drawerRef  = useRef(null);
  const titleId    = useId();

  // ── Populate / reset on open ───────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        const f = {
          name:         initialData.name         || '',
          customerType: initialData.customerType ||
                        (initialData.gstin ? 'B2B' : 'B2C'),
          gstin:        initialData.gstin        || '',
          state:        initialData.state        || '',
          email:        initialData.email        || '',
          phone:        initialData.phone        || '',
          address:      initialData.address      || '',
        };
        setForm(f);
        setShowContact(!!(f.email || f.phone));
        if (f.gstin) {
          setGstinValid(validateGSTIN(f.gstin));
        }
      } else {
        const f = { ...EMPTY_FORM(), name: prefillName || '' };
        setForm(f);
        setShowContact(false);
        setGstinValid(null);
      }
      setErrors({});
      setSaveError('');
      setSaving(false);
      // Autofocus name
      setTimeout(() => nameRef.current?.focus(), 60);
    }
  }, [isOpen, initialData, prefillName]);

  // ── ESC key ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const onKey = e => {
      if (e.key === 'Escape') attemptClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, form]);

  // ── Body scroll lock ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
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
      set('customerType', 'B2B');
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
    if (form.customerType === 'B2B') {
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

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async e => {
    e.preventDefault();
    if (!validate()) return;
    setSaveError('');
    try {
      setSaving(true);
      const payload = {
        name:         form.name.trim(),
        customerType: form.customerType,
        gstin:        form.customerType === 'B2B' ? form.gstin.trim() : '',
        state:        form.state,
        email:        form.email.trim(),
        phone:        form.phone.trim(),
        address:      form.address.trim(),
      };
      const saved = await onSave(payload);
      return saved; // caller might use this
    } catch (err) {
      setSaveError(err.message || 'Failed to save customer. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Close with dirty-check ─────────────────────────────────────────────────
  const attemptClose = useCallback(() => {
    if (isDirty(form) && !isEditing) {
      if (!window.confirm('Discard unsaved customer details?')) return;
    }
    onClose();
  }, [form, isEditing, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
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
                onChange={v => set('customerType', v)}
                options={CUSTOMER_TYPE_OPTIONS}
              />
            </div>

            {/* GSTIN — shown only for Registered (B2B) */}
            {form.customerType === 'B2B' && (
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

        {/* ── Sticky footer ────────────────────────────────────────────────── */}
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
      </div>
    </>
  );
}

export default CustomerDrawer;

