/**
 * ProductDrawer.jsx
 * Right-side drawer for Add / Edit a catalog item (product or service).
 *
 * Props:
 *   isOpen        boolean
 *   onClose       () => void
 *   onSave        (formData) => Promise<void>
 *   initialData   object | null  (null = add new, object = edit existing)
 *   isDuplicate   boolean        (true = save as new item with "(copy)" suffix)
 */

import React, {
  useState, useEffect, useRef, useCallback, useId,
} from 'react';
import { X, Loader2, AlertCircle, Plus, ChevronDown } from 'lucide-react';
import {
  Field, Input, Select, Button, Textarea,
} from '../invoice/InvoiceEditorUI';
import { GST_RATES } from '../../gst/taxRules';
import { useUnsavedChanges } from '../../utils/useUnsavedChanges';

// ── Constants ─────────────────────────────────────────────────────────────────

const UNITS = ['Nos', 'Hours', 'Days', 'Months', 'Sessions', 'Pcs', 'Kg', 'Units', 'Set'];

const EMPTY_FORM = () => ({
  name: '',
  type: 'Service',
  hsnSac: '',
  gstRate: 18,
  rate: '',
  unit: 'Nos',
  description: '',
});

// Short GST labels for the select options (keep existing values)
const GST_SHORT_LABELS = {
  0: '0%',
  5: '5%',
  12: '12%',
  18: '18%',
  28: '28%',
};

// GST hints per rate
const GST_HINTS = {
  0: 'Exempt / Nil rated items',
  5: 'Essential goods & services',
  12: 'Standard goods',
  18: 'Standard rate for most services',
  28: 'Luxury goods & services',
};

// ── Segmented control (Service / Goods) ───────────────────────────────────────
function SegmentedControl({ value, onChange }) {
  const options = [
    { value: 'Service', label: 'Service' },
    { value: 'Product', label: 'Goods' },
  ];
  return (
    <div role="radiogroup" aria-label="Item type" className="flex h-10 rounded-lg border border-border bg-bg overflow-hidden">
      {options.map((opt) => {
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

// ── Main Drawer ───────────────────────────────────────────────────────────────
export function ProductDrawer({
  isOpen,
  onClose,
  onSave,
  initialData = null,
  isDuplicate = false,
}) {
  const isEditing = Boolean(initialData) && !isDuplicate;
  const titleId = useId();
  const nameRef = useRef(null);
  const drawerRef = useRef(null);
  const keepEditingBtnRef = useRef(null);

  const [form, setForm] = useState(EMPTY_FORM());
  const [initialBaseline, setInitialBaseline] = useState(EMPTY_FORM());
  const { isDirty } = useUnsavedChanges(form, initialBaseline);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [showDescription, setShowDescription] = useState(false);

  const set = useCallback((key, val) => setForm((f) => ({ ...f, [key]: val })), []);

  // ── Populate / reset on open ───────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      let f;
      if (initialData) {
        f = {
          name: isDuplicate
            ? `${initialData.name || ''} (copy)`
            : (initialData.name || ''),
          type: initialData.type || 'Service',
          hsnSac: initialData.hsnSac || '',
          gstRate: initialData.gstRate ?? 18,
          rate: initialData.rate !== undefined && initialData.rate !== null
            ? String(initialData.rate)
            : '',
          unit: initialData.unit || 'Nos',
          description: initialData.description || '',
        };
        setShowDescription(!!initialData.description);
      } else {
        f = EMPTY_FORM();
        setShowDescription(false);
      }
      setForm(f);
      setInitialBaseline(f);
      setErrors({});
      setSaveError('');
      setSaving(false);
      setConfirmingDiscard(false);
      setTimeout(() => nameRef.current?.focus(), 60);
    }
  }, [isOpen, initialData, isDuplicate]);

  // ── Focus trap ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        attemptClose();
      }
      if (e.key === 'Tab') {
        const focusable = drawerRef.current?.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]'
        );
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isDirty]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Close handler ─────────────────────────────────────────────────────────
  const attemptClose = useCallback(() => {
    if (!isDirty) {
      setConfirmingDiscard(false);
      onClose();
    } else {
      setConfirmingDiscard(true);
      setTimeout(() => keepEditingBtnRef.current?.focus(), 20);
    }
  }, [isDirty, onClose]);

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required.';
    if (form.hsnSac && !/^\d{0,8}$/.test(form.hsnSac)) {
      errs.hsnSac = 'Only digits, max 8 characters.';
    }
    if (form.rate !== '' && isNaN(parseFloat(form.rate))) {
      errs.rate = 'Enter a valid number.';
    }
    return errs;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      // Focus first invalid field
      if (errs.name) nameRef.current?.focus();
      return;
    }
    setErrors({});
    setSaveError('');
    try {
      setSaving(true);
      await onSave({
        name: form.name.trim(),
        type: form.type,
        hsnSac: form.hsnSac.trim(),
        gstRate: Number(form.gstRate),
        rate: form.rate !== '' ? parseFloat(form.rate) : 0,
        unit: form.unit,
        description: form.description.trim(),
      });
      onClose();
    } catch (err) {
      setSaveError(err.message || 'Failed to save item.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const hsnSacLabel = form.type === 'Service' ? 'SAC code' : 'HSN code';
  const hsnSacPlaceholder = form.type === 'Service' ? '998314' : '8471';
  const gstHint = GST_HINTS[Number(form.gstRate)] || '';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity duration-300"
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
        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 id={titleId} className="text-[15px] font-semibold text-text">
            {isEditing ? 'Edit item' : isDuplicate ? 'Duplicate item' : 'Add item'}
          </h2>
          <button
            type="button"
            onClick={attemptClose}
            aria-label="Close drawer"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-text hover:bg-border transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Scrollable body ───────────────────────────────────────────── */}
        <form
          id="product-drawer-form"
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
            <Field label="Name" htmlFor="product-name" error={errors.name}>
              <Input
                ref={nameRef}
                id="product-name"
                name="name"
                type="text"
                value={form.name}
                placeholder="e.g. Website Design & Development"
                autoComplete="off"
                error={errors.name}
                onChange={(e) => set('name', e.target.value)}
                onBlur={() => {
                  if (!form.name.trim()) setErrors((prev) => ({ ...prev, name: 'Name is required.' }));
                  else setErrors((prev) => { const { name: _, ...rest } = prev; return rest; });
                }}
              />
            </Field>

            {/* Type segmented control */}
            <Field label="Type" htmlFor="product-type">
              <SegmentedControl
                value={form.type}
                onChange={(v) => set('type', v)}
              />
            </Field>

            {/* HSN / SAC code */}
            <Field
              label={hsnSacLabel}
              htmlFor="product-hsnsac"
              optional
              error={errors.hsnSac}
            >
              <Input
                id="product-hsnsac"
                name="hsnSac"
                type="text"
                inputMode="numeric"
                maxLength={8}
                value={form.hsnSac}
                placeholder={hsnSacPlaceholder}
                error={errors.hsnSac}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
                  set('hsnSac', digits);
                }}
                onBlur={() => {
                  if (form.hsnSac && !/^\d{0,8}$/.test(form.hsnSac)) {
                    setErrors((prev) => ({ ...prev, hsnSac: 'Only digits, max 8 characters.' }));
                  } else {
                    setErrors((prev) => { const { hsnSac: _, ...rest } = prev; return rest; });
                  }
                }}
              />
            </Field>
          </div>

          {/* ── Section: Pricing ────────────────────────────────────────── */}
          <div className="space-y-4">
            <p className="text-[13px] font-semibold text-text tracking-tight">Pricing</p>

            {/* Rate + Unit side by side from sm */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Default rate */}
              <Field label="Default rate" htmlFor="product-rate" optional error={errors.rate}>
                <div className={`flex h-10 rounded-lg border ${errors.rate ? 'border-danger' : 'border-border'} bg-surface overflow-hidden focus-within:ring-2 focus-within:ring-accent focus-within:border-accent`}>
                  <span className="flex items-center px-3 text-sm font-medium text-muted border-r border-border bg-bg shrink-0 select-none">
                    ₹
                  </span>
                  <input
                    id="product-rate"
                    name="rate"
                    type="text"
                    inputMode="decimal"
                    value={form.rate}
                    placeholder="0.00"
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '' || /^\d*\.?\d*$/.test(v)) set('rate', v);
                    }}
                    onBlur={() => {
                      if (form.rate !== '' && isNaN(parseFloat(form.rate))) {
                        setErrors((prev) => ({ ...prev, rate: 'Enter a valid number.' }));
                      } else {
                        setErrors((prev) => { const { rate: _, ...rest } = prev; return rest; });
                      }
                    }}
                    className="flex-1 h-full px-3 text-sm font-normal text-text bg-transparent placeholder:text-faint focus:outline-none text-right tabular-nums"
                  />
                </div>
              </Field>

              {/* Unit */}
              <Field label="Unit" htmlFor="product-unit">
                <Select
                  id="product-unit"
                  name="unit"
                  value={form.unit}
                  onChange={(e) => set('unit', e.target.value)}
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </Select>
              </Field>
            </div>

            {/* GST rate — full width */}
            <Field
              label="GST rate"
              htmlFor="product-gst"
              helper={gstHint}
            >
              <Select
                id="product-gst"
                name="gstRate"
                value={form.gstRate}
                onChange={(e) => set('gstRate', Number(e.target.value))}
              >
                {GST_RATES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {GST_SHORT_LABELS[r.value] ?? `${r.value}%`}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {/* ── Section: Details (collapsible description) ──────────────── */}
          <div className="space-y-3">
            <p className="text-[13px] font-semibold text-text tracking-tight">Details</p>

            {showDescription ? (
              <Field label="Description" htmlFor="product-description" optional>
                <Textarea
                  id="product-description"
                  name="description"
                  rows={3}
                  value={form.description}
                  placeholder="Scope of work or item specifications"
                  onChange={(e) => set('description', e.target.value)}
                />
              </Field>
            ) : (
              <button
                type="button"
                onClick={() => setShowDescription(true)}
                className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-text transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add description</span>
              </button>
            )}
          </div>
        </form>

        {/* ── Sticky footer: Normal vs Inline Confirm ───────────────────── */}
        {confirmingDiscard ? (
          <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-3.5 border-t border-border bg-surface">
            <span className="text-xs font-semibold text-text">Discard changes?</span>
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
              form="product-drawer-form"
              variant="primary"
              size="md"
              disabled={saving}
              className="min-w-[110px]"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : isEditing ? 'Save item' : 'Add item'}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

export default ProductDrawer;

