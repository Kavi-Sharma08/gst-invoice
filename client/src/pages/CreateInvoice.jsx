/**
 * CreateInvoice.jsx — GST Invoice Editor
 *
 * Design System:
 *  - Colors: only semantic names (bg, surface, border, text, muted, faint, accent, danger)
 *  - Scale: inputs h-10, rounded-lg, text-sm, gap-4, sections space-y-8
 *  - Font: Inter everywhere (no monospace); tabular-nums on all amounts
 *  - Type scale: title 20px/600, section heading 15px/600, label 13px/500 muted,
 *    input 14px/400, helper 12px faint, column headers 12px/500 muted
 *  - Shared primitives: Field, Input, Select, SectionHeading, Button, Divider, Textarea
 *
 * Grid & Layout Alignment:
 *  - Right edge alignment: Title bar, banners, form card, and Summary share grid-cols-[minmax(0,1fr)_360px] gap-8
 *  - Items row fills form width: grid-cols-[minmax(0,1fr)_110px_80px_110px_90px_110px_40px] gap-3, no extra left indent
 *  - Single "Full preview" button under Print / PDF; Live Preview card removed
 *  - Dismissible missing-business-info banner (local state)
 *  - Reduced vertical spacing above the form
 */

import React, {
  useState, useEffect, useRef, useMemo, useCallback, useId
} from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Trash2, Plus, Printer, Download, Save,
  ChevronDown, Sparkles, AlertCircle, Eye, X
} from 'lucide-react';

import { useAuth }          from '../context/AuthContext';
import { invoicesApi }      from '../api/invoices.api';
import { businessApi }      from '../api/business.api';
import { customersApi }     from '../api/customers.api';
import { productsApi }      from '../api/products.api';
import { CustomerDrawer }   from '../components/customer/CustomerDrawer';

import { determineTaxType, calculateInvoiceTotal } from '../gst/calculateGST';
import { validateGSTIN }                            from '../gst/validateGSTIN';
import { generateNextInvoiceNumber, isDuplicateInvoiceNumber } from '../utils/invoiceNumber';
import { getTodayInputDate, formatDate }            from '../utils/date';
import { formatCurrency, numberToWords }            from '../utils/currency';
import { INDIAN_STATES }                            from '../gst/taxRules';
import { useAppNavigate }                           from '../utils/navigation';
import { ProductPickerModal }                       from '../components/invoice/ProductPickerModal';
import { normalizeCustomerType, getCustomerTypeLabel } from '../utils/customer';
import { useDebounce }                               from '../utils/useDebounce';
import { useUnsavedChanges, useNavigationBlocker }  from '../utils/useUnsavedChanges';
import { ConfirmDialog }                            from '../components/ui/ConfirmDialog';
import {
  Field, Input, Select, Button, SectionHeading, Divider, Textarea
} from '../components/invoice/InvoiceEditorUI';

// Helper to normalize invoice form values for deep dirty comparison
function extractInvoiceValues(inv) {
  if (!inv) return null;
  return {
    invoiceNumber: inv.invoiceNumber || '',
    invoiceDate: inv.invoiceDate || '',
    dueDate: inv.dueDate || '',
    selectedCustomerId: String(inv.selectedCustomerId || ''),
    customerData: {
      name: inv.customerData?.name || '',
      gstin: inv.customerData?.gstin || '',
      customerType: normalizeCustomerType(inv.customerData?.customerType),
      address: inv.customerData?.address || '',
      state: inv.customerData?.state || '',
      phone: inv.customerData?.phone || '',
      email: inv.customerData?.email || '',
    },
    placeOfSupply: inv.placeOfSupply || '',
    items: (inv.items || []).map(it => ({
      description: it.description || '',
      hsnSac: it.hsnSac || '',
      quantity: String(it.quantity ?? ''),
      rate: String(it.rate ?? ''),
      gstRate: Number(it.gstRate || 0),
    })),
    notes: inv.notes || '',
    terms: inv.terms || '',
    bankDetails: {
      bankName: inv.bankDetails?.bankName || '',
      accountNumber: inv.bankDetails?.accountNumber || '',
      ifscCode: inv.bankDetails?.ifscCode || '',
      branch: inv.bankDetails?.branch || '',
      upiId: inv.bankDetails?.upiId || '',
    },
  };
}

// ── Date Helpers (DD/MM/YYYY in UI, ISO in state) ─────────────────────────────

function isoToDisplay(iso) {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  }
  return iso;
}

function displayToIso(display) {
  if (!display) return '';
  const clean = display.trim();
  const parts = clean.split(/[/.-]/);
  if (parts.length === 3) {
    const [d, m, y] = parts;
    if (d && m && y && y.length === 4) {
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }
  return clean;
}

const EMPTY_ITEM = () => ({
  description: '',
  hsnSac:      '',
  quantity:    '1',
  unit:        'Nos',
  rate:        '0',
  discount:    0,
  gstRate:     18,
});

// Exact grid template for items: Description flexible, Qty >= 80px, fills entire width
const ITEMS_GRID_CLASS = 'grid-cols-[minmax(0,1fr)_110px_80px_110px_90px_110px_40px] gap-3';

// ── CustomerCombobox ──────────────────────────────────────────────────────────
// Calls customersApi.search with a 300ms debounce. An empty query shows recent customers.
function CustomerCombobox({ value, onChange, onSelectCustomer, error, id = 'customer-name', onQuickAdd }) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const containerRef    = useRef(null);

  const debouncedQuery = useDebounce(value, 300);

  useEffect(() => {
    let active = true;
    if (open) {
      customersApi
        .search({ q: (debouncedQuery || '').trim(), limit: 10 })
        .then((res) => {
          if (active) {
            const list = Array.isArray(res?.data) ? res.data : [];
            setResults(list);
          }
        })
        .catch(() => {
          if (active) setResults([]);
        });
    }
    return () => {
      active = false;
    };
  }, [open, debouncedQuery]);

  // Show quick-add option when typed text doesn't match any customer exactly
  const showQuickAdd = Boolean(
    onQuickAdd &&
    value.trim() &&
    !results.some(c => c.name?.toLowerCase() === value.trim().toLowerCase())
  );

  useEffect(() => {
    function outside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Input
          id={id}
          type="text"
          value={value}
          autoComplete="off"
          placeholder="Customer name"
          error={error}
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setOpen(o => !o)}
          aria-label="Toggle saved customers"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-text p-1 cursor-pointer"
        >
          <ChevronDown className={`w-4 h-4 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && (results.length > 0 || showQuickAdd) && (
        <ul
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-lg bg-surface border border-border shadow-xl py-1 text-sm"
        >
          {results.map(c => (
            <li
              key={c._id || c.id}
              role="option"
              onClick={() => { onSelectCustomer(c); setOpen(false); }}
              className="px-3 py-2.5 hover:bg-border cursor-pointer flex items-center justify-between border-b border-border last:border-0"
            >
              <div>
                <div className="font-medium text-text">{c.name}</div>
                <div className="text-xs text-muted mt-0.5">
                  {c.gstin ? `GSTIN: ${c.gstin}` : getCustomerTypeLabel(c.customerType)}
                  {c.state ? ` · ${c.state}` : ''}
                </div>
              </div>
              <span className="text-xs text-accent font-medium ml-4 shrink-0">Select</span>
            </li>
          ))}

          {showQuickAdd && (
            <li
              role="option"
              onClick={() => { setOpen(false); onQuickAdd(value.trim()); }}
              className="px-3 py-2.5 hover:bg-accent/10 cursor-pointer flex items-center gap-2 text-accent font-medium border-t border-border"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              Add "{value.trim()}" as new customer
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

// ── DateInput (DD/MM/YYYY in UI, ISO in state) ────────────────────────────────
function DateInput({ id, value, onChange, placeholder, error }) {
  const [display, setDisplay] = useState(() => isoToDisplay(value));

  useEffect(() => { setDisplay(isoToDisplay(value)); }, [value]);

  return (
    <Input
      id={id}
      type="text"
      value={display}
      placeholder={placeholder || 'DD/MM/YYYY'}
      error={error}
      maxLength={10}
      onChange={e => {
        const raw = e.target.value;
        setDisplay(raw);
        onChange(displayToIso(raw));
      }}
    />
  );
}

// ── Items Header Row ──────────────────────────────────────────────────────────
function ItemsHeader() {
  return (
    <div
      className={`hidden @[680px]/form:grid items-center ${ITEMS_GRID_CLASS} py-1 text-xs font-medium text-muted uppercase tracking-wide`}
    >
      <div>Description</div>
      <div>HSN/SAC</div>
      <div className="text-right">Qty</div>
      <div className="text-right">Rate</div>
      <div>GST</div>
      <div className="text-right">Amount</div>
      <div />
    </div>
  );
}

// ── ItemRow (Desktop single-line vs Mobile stacked) ───────────────────────────
function ItemRow({ item, idx, totalRows, errors, onChange, onRemove }) {
  const descRef   = useRef(null);
  const amount    = (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0);
  const descError = errors[`item_${idx}_description`];
  const qtyError  = errors[`item_${idx}_quantity`];
  const rateError = errors[`item_${idx}_rate`];

  // Auto-resize description textarea
  useEffect(() => {
    const el = descRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, [item.description]);

  return (
    <>
      {/* ── Desktop: single-line row (aligned flush with Items heading) ── */}
      <div
        className={`hidden @[680px]/form:grid items-start ${ITEMS_GRID_CLASS} py-1.5 rounded-lg transition-colors hover:bg-bg`}
      >
        {/* Description: single-line by default, auto-resizes on long text */}
        <div>
          <textarea
            ref={descRef}
            id={`item_${idx}_description`}
            rows={1}
            placeholder="Item or service"
            value={item.description}
            onChange={e => {
              onChange(idx, 'description', e.target.value);
              const el = e.target;
              el.style.height = 'auto';
              el.style.height = el.scrollHeight + 'px';
            }}
            className={[
              'w-full rounded-lg border px-3 py-2 text-sm font-normal text-text bg-surface placeholder:text-faint',
              'focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent resize-none overflow-hidden leading-snug',
              descError ? 'border-danger' : 'border-border',
            ].join(' ')}
            style={{ minHeight: '40px' }}
          />
          {descError && <p className="mt-0.5 text-xs text-danger">{descError}</p>}
        </div>

        {/* HSN/SAC */}
        <div>
          <Input
            type="text"
            placeholder="—"
            value={item.hsnSac}
            onChange={e => onChange(idx, 'hsnSac', e.target.value)}
          />
        </div>

        {/* Qty: type="text" inputMode="numeric" (digits only, px-2 text-right) */}
        <div>
          <Input
            id={`item_${idx}_quantity`}
            type="text"
            inputMode="numeric"
            value={item.quantity ?? ''}
            error={qtyError}
            className="w-full px-2 text-right tabular-nums"
            onChange={e => {
              const digits = e.target.value.replace(/\D/g, '');
              onChange(idx, 'quantity', digits);
            }}
          />
        </div>

        {/* Rate: inputMode="decimal" */}
        <div>
          <Input
            id={`item_${idx}_rate`}
            type="text"
            inputMode="decimal"
            value={item.rate ?? ''}
            error={rateError}
            className="w-full px-2 text-right tabular-nums"
            onChange={e => {
              const val = e.target.value;
              if (val === '' || /^\d*\.?\d*$/.test(val)) {
                onChange(idx, 'rate', val);
              }
            }}
          />
        </div>

        {/* GST: short label */}
        <div>
          <Select
            value={item.gstRate}
            onChange={e => onChange(idx, 'gstRate', Number(e.target.value))}
          >
            <option value={0}>0%</option>
            <option value={5}>5%</option>
            <option value={12}>12%</option>
            <option value={18}>18%</option>
            <option value={28}>28%</option>
          </Select>
        </div>

        {/* Amount: read-only, tabular-nums, text-right */}
        <div className="flex items-center justify-end h-10 text-sm font-medium tabular-nums text-right text-text">
          {formatCurrency(amount)}
        </div>

        {/* Delete button: disabled when only one row remains */}
        <div className="flex items-center justify-center h-10">
          <button
            type="button"
            onClick={() => onRemove(idx)}
            disabled={totalRows <= 1}
            aria-label={`Remove item ${idx + 1}`}
            title={totalRows <= 1 ? 'At least one item required' : 'Remove this item'}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-danger hover:bg-danger/10 disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Mobile: stacked block (when form width < 680px) ── */}
      <div className="@[680px]/form:hidden space-y-3 p-3 rounded-lg border border-border bg-bg">
        <Field label="Description" error={descError}>
          <textarea
            rows={2}
            placeholder="Item or service"
            value={item.description}
            onChange={e => onChange(idx, 'description', e.target.value)}
            className={[
              'w-full rounded-lg border px-3 py-2 text-sm font-normal text-text bg-surface placeholder:text-faint',
              'focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent resize-y',
              descError ? 'border-danger' : 'border-border',
            ].join(' ')}
          />
        </Field>

        <Field label="HSN/SAC" optional>
          <Input
            type="text"
            placeholder="—"
            value={item.hsnSac}
            onChange={e => onChange(idx, 'hsnSac', e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-3 gap-2">
          <Field label="Qty" error={qtyError}>
            <Input
              type="text"
              inputMode="numeric"
              value={item.quantity ?? ''}
              error={qtyError}
              className="w-full px-2 text-right tabular-nums"
              onChange={e => {
                const digits = e.target.value.replace(/\D/g, '');
                onChange(idx, 'quantity', digits);
              }}
            />
          </Field>
          <Field label="Rate (₹)" error={rateError}>
            <Input
              type="text"
              inputMode="decimal"
              value={item.rate ?? ''}
              error={rateError}
              className="w-full px-2 text-right tabular-nums"
              onChange={e => {
                const val = e.target.value;
                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                  onChange(idx, 'rate', val);
                }
              }}
            />
          </Field>
          <Field label="GST">
            <Select
              value={item.gstRate}
              onChange={e => onChange(idx, 'gstRate', Number(e.target.value))}
            >
              <option value={0}>0%</option>
              <option value={5}>5%</option>
              <option value={12}>12%</option>
              <option value={18}>18%</option>
              <option value={28}>28%</option>
            </Select>
          </Field>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-sm font-medium text-text tabular-nums">
            {formatCurrency(amount)}
          </span>
          <button
            type="button"
            onClick={() => onRemove(idx)}
            disabled={totalRows <= 1}
            aria-label={`Remove item ${idx + 1}`}
            className="flex items-center gap-1 text-xs text-muted hover:text-danger disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" /> Remove
          </button>
        </div>
      </div>
    </>
  );
}

// ── TotalsPanel (Summary Card) ────────────────────────────────────────────────
function TotalsPanel({ calc, isInterState, isInvoiceEmpty, onPrint, onDownloadPdf, onFullPreview }) {
  const taxRows = isInterState
    ? [{ label: 'IGST', value: calc.igst ?? 0 }]
    : [
        { label: 'CGST', value: calc.cgst ?? 0 },
        { label: 'SGST', value: calc.sgst ?? 0 }
      ];

  return (
    <div className="bg-surface rounded-xl border border-border p-5 space-y-4">
      <SectionHeading>Summary</SectionHeading>
      <Divider />

      <div className="space-y-2.5 text-sm">
        <div className="flex justify-between">
          <span className="text-muted">Subtotal</span>
          <span className="tabular-nums text-right font-medium text-text">{formatCurrency(calc.taxableAmount ?? 0)}</span>
        </div>

        {taxRows.map(r => (
          <div key={r.label} className="flex justify-between">
            <span className="text-muted">{r.label}</span>
            <span className="tabular-nums text-right font-medium text-text">{formatCurrency(r.value)}</span>
          </div>
        ))}

        {/* Total tax row gets same font-medium weight as Subtotal, CGST and SGST */}
        <div className="flex justify-between">
          <span className="text-muted">Total tax</span>
          <span className="tabular-nums text-right font-medium text-text">{formatCurrency(calc.totalTax ?? 0)}</span>
        </div>
      </div>

      <Divider />

      <div className="flex items-center justify-between pt-1">
        <span className="text-sm font-semibold text-text">Grand total</span>
        <span className="text-lg font-semibold text-accent tabular-nums text-right">
          {formatCurrency(calc.grandTotal ?? 0)}
        </span>
      </div>

      {(calc.grandTotal ?? 0) > 0 && (
        <p className="text-xs text-faint italic leading-relaxed pt-1 border-t border-border">
          {numberToWords(calc.grandTotal)}
        </p>
      )}

      {/* Export actions: Print & PDF disabled when invoice is empty */}
      <div className="grid grid-cols-2 gap-2 pt-2">
        <Button variant="secondary" size="sm" onClick={onPrint} disabled={isInvoiceEmpty}>
          <Printer className="w-3.5 h-3.5" /> Print
        </Button>
        <Button variant="secondary" size="sm" onClick={onDownloadPdf} disabled={isInvoiceEmpty}>
          <Download className="w-3.5 h-3.5" /> PDF
        </Button>
      </div>

      {/* Single "Full preview" button under Print / PDF */}
      <Button
        variant="secondary"
        size="sm"
        className="w-full"
        onClick={onFullPreview}
      >
        <Eye className="w-3.5 h-3.5" /> Full preview
      </Button>
    </div>
  );
}

// ── Preview Sheet Modal ───────────────────────────────────────────────────────
function PreviewSheet({ payload, calc, onClose }) {
  const { business, customer, invoiceNumber, invoiceDate, dueDate, status, taxType, placeOfSupply, items } = payload;
  const isInterState = taxType === 'INTER';

  return (
    <div className="bg-surface text-text rounded-xl border border-border p-6 sm:p-8 text-xs space-y-6">
      <div className="flex items-start justify-between pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-border text-text flex items-center justify-center text-xs font-semibold">₹</span>
            <h2 className="text-sm font-semibold text-text uppercase tracking-wider">Tax Invoice</h2>
          </div>
          <p className="text-xs text-faint mt-1">Original for Recipient · Rule 46 CGST Rules</p>
        </div>
        <div className="text-right flex flex-col items-end gap-1">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-muted hover:text-text p-1 cursor-pointer"
              aria-label="Close preview"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium uppercase bg-border text-muted">
            {status || 'Draft'}
          </span>
          <div className="text-sm font-semibold text-text tabular-nums">{invoiceNumber || 'INV-DRAFT'}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-3 rounded-lg bg-bg border border-border space-y-1">
          <span className="text-xs font-medium text-faint uppercase tracking-wider block">From</span>
          <div className="font-semibold text-text">{business?.businessName || 'Your Business'}</div>
          {business?.gstin && <div className="text-muted">GSTIN: {business.gstin}</div>}
          {business?.address && <div className="text-muted whitespace-pre-line">{business.address}</div>}
        </div>
        <div className="p-3 rounded-lg bg-bg border border-border space-y-1">
          <span className="text-xs font-medium text-faint uppercase tracking-wider block">Bill To</span>
          <div className="font-semibold text-text">{customer?.name || '—'}</div>
          {customer?.gstin && <div className="text-muted">GSTIN: {customer.gstin}</div>}
          {customer?.address && <div className="text-muted whitespace-pre-line">{customer.address}</div>}
          {placeOfSupply && <div className="text-muted">{placeOfSupply}</div>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 text-xs">
        <div><span className="text-faint block">Invoice No.</span><span className="font-medium text-text">{invoiceNumber}</span></div>
        <div><span className="text-faint block">Date</span><span className="font-medium text-text">{formatDate(invoiceDate)}</span></div>
        <div><span className="text-faint block">Due</span><span className="font-medium text-text">{dueDate ? formatDate(dueDate) : 'Immediate'}</span></div>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border text-faint text-xs uppercase tracking-wide">
            {['#', 'Description', 'HSN', 'Qty', 'Rate', 'GST', 'Amount'].map(h => (
              <th key={h} className={`py-2 px-1 font-medium ${['Qty', 'Rate', 'GST', 'Amount'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {(calc.items || items).map((it, i) => (
            <tr key={i}>
              <td className="py-2 px-1 text-faint">{i + 1}</td>
              <td className="py-2 px-1 text-text">{it.description}</td>
              <td className="py-2 px-1 text-muted">{it.hsnSac || '—'}</td>
              <td className="py-2 px-1 text-right tabular-nums">{it.quantity}</td>
              <td className="py-2 px-1 text-right tabular-nums">{formatCurrency(it.rate)}</td>
              <td className="py-2 px-1 text-right tabular-nums">{it.gstRate}%</td>
              <td className="py-2 px-1 text-right tabular-nums font-medium">{formatCurrency((parseFloat(it.quantity) || 0) * (parseFloat(it.rate) || 0))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end pt-2">
        <div className="w-56 space-y-1.5 text-xs">
          <div className="flex justify-between"><span className="text-muted">Subtotal</span><span className="tabular-nums text-right font-medium">{formatCurrency(calc.taxableAmount ?? 0)}</span></div>
          {isInterState
            ? <div className="flex justify-between"><span className="text-muted">IGST</span><span className="tabular-nums text-right">{formatCurrency(calc.igst ?? 0)}</span></div>
            : <>
                <div className="flex justify-between"><span className="text-muted">CGST</span><span className="tabular-nums text-right">{formatCurrency(calc.cgst ?? 0)}</span></div>
                <div className="flex justify-between"><span className="text-muted">SGST</span><span className="tabular-nums text-right">{formatCurrency(calc.sgst ?? 0)}</span></div>
              </>
          }
          <div className="border-t border-border pt-1.5 flex justify-between font-semibold text-text text-sm">
            <span>Grand Total</span><span className="tabular-nums text-right text-accent">{formatCurrency(calc.grandTotal ?? 0)}</span>
          </div>
          <p className="text-xs text-faint italic">{numberToWords(calc.grandTotal ?? 0)}</p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main CreateInvoice Component
// ═══════════════════════════════════════════════════════════════════════════════

export function CreateInvoice({ invoiceId: propInvoiceId, onNavigate: propOnNavigate }) {
  const queryClient = useQueryClient();
  const params      = useParams();
  const appNavigate = useAppNavigate();
  const onNavigate  = propOnNavigate || appNavigate;
  const invoiceId   = propInvoiceId  || params.id;
  const isEditing   = Boolean(invoiceId);
  const { isLoaded, isSignedIn } = useAuth();

  // State
  // Start as loading only while auth is still resolving; once auth is ready,
  // loadSetupData sets it back to true then false when done.
  const [loading,            setLoading]           = useState(true);
  const [saving,             setSaving]            = useState(false);
  const [showPreviewModal,   setShowPreviewModal]  = useState(false);
  const [errors,             setErrors]            = useState({});
  const [showContactDetails, setShowContactDetails]= useState(false);
  const [showProductPicker,  setShowProductPicker] = useState(false);
  const [noticeDismissed,    setNoticeDismissed]   = useState(false);
  const [customerDrawerOpen, setCustomerDrawerOpen]= useState(false);
  const [customerDrawerName, setCustomerDrawerName]= useState('');

  // Dirty tracking — navigation blocking UX
  const [isJustSaved,      setIsJustSaved]      = useState(false);
  const [showLeaveDialog,  setShowLeaveDialog]  = useState(false);
  const [pendingNavigation,setPendingNavigation]= useState(null);
  const bypassNavRef = useRef(false); // set to true when user confirms Leave

  // Business & DB Data
  const [business,         setBusiness]         = useState(null);
  const [customers,        setCustomers]        = useState([]);
  const [existingInvoices, setExistingInvoices] = useState([]);
  const [settings,         setSettings]         = useState(null);

  // Form State
  const [invoiceNumber,      setInvoiceNumber]     = useState('');
  const [invoiceDate,        setInvoiceDate]       = useState(getTodayInputDate());
  const [dueDate,            setDueDate]           = useState('');
  const [status,             setStatus]            = useState('Draft');
  const [selectedCustomerId, setSelectedCustomerId]= useState('');
  const [customerData,       setCustomerData]      = useState({ name: '', gstin: '', address: '', state: '', phone: '', email: '' });
  const [placeOfSupply,      setPlaceOfSupply]     = useState('');
  const [items,              setItems]             = useState([EMPTY_ITEM()]);
  const [notes,              setNotes]             = useState('');
  const [terms,              setTerms]             = useState('');
  const [bankDetails,        setBankDetails]       = useState({ bankName: '', accountNumber: '', ifscCode: '', branch: '', upiId: '' });

  const itemDescriptionRefs = useRef([]);

  // ── Deep dirty tracking ────────────────────────────────────────────────────
  // Build a snapshot of the current form values for comparison
  const invoiceFormValues = useMemo(() => extractInvoiceValues({
    invoiceNumber, invoiceDate, dueDate,
    selectedCustomerId, customerData, placeOfSupply,
    items, notes, terms, bankDetails,
  }), [invoiceNumber, invoiceDate, dueDate, selectedCustomerId, customerData,
       placeOfSupply, items, notes, terms, bankDetails]);

  // baseline is set to null initially; resetBaseline() is called after load
  const baselineRef = useRef(null);
  const [baseline, setBaseline] = useState(null);

  const { isDirty, resetBaseline } = useUnsavedChanges(invoiceFormValues, baseline);

  // Navigation blocker — intercepts router push/replace and popstate
  useNavigationBlocker(
    isDirty && !saving,
    (resume) => {
      setPendingNavigation(() => resume);
      setShowLeaveDialog(true);
    },
    bypassNavRef,
  );

  // beforeunload — attach only while dirty
  useEffect(() => {
    if (!isDirty || saving) return;
    const handle = e => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handle);
    return () => window.removeEventListener('beforeunload', handle);
  }, [isDirty, saving]);

  // "Saved" indicator auto-dismisses after 2.5 s
  const savedTimerRef = useRef(null);
  const markSaved = useCallback(() => {
    setIsJustSaved(true);
    clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setIsJustSaved(false), 2500);
  }, []);

  // Load initial data
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      loadSetupData();
    } else if (isLoaded && !isSignedIn) {
      setLoading(false);
    }
  }, [invoiceId, isLoaded, isSignedIn]);

  const loadSetupData = async () => {
    try {
      setLoading(true);
      const [bRes, numRes] = await Promise.all([
        businessApi.get(),
        invoicesApi.getNextNumber(),
      ]);
      const biz      = bRes?.data || null;
      const nextNum  = numRes?.data?.nextInvoiceNumber || 'INV/26-27/001';
      const sets = {
        invoicePrefix:  biz?.invoiceSettings?.invoicePrefix  || 'INV/',
        startingNumber: biz?.invoiceSettings?.startingNumber || 1,
        defaultNotes:   biz?.invoiceSettings?.defaultNotes   || 'Thank you for your business!',
        defaultTerms:   biz?.invoiceSettings?.defaultTerms   || 'Payment due within 15 days.',
        bankDetails:    biz?.bankDetails || {},
      };
      setBusiness(biz); setCustomers([]); setExistingInvoices([]); setSettings(sets);

      let loadedValues;
      if (isEditing) {
        const res = await invoicesApi.get(invoiceId);
        const inv = res?.data || null;
        if (inv) {
          setInvoiceNumber(inv.invoiceNumber || '');
          setInvoiceDate(inv.invoiceDate || getTodayInputDate());
          setDueDate(inv.dueDate || '');
          setStatus(inv.status || 'Draft');
          setSelectedCustomerId(inv.customerId ? String(inv.customerId) : '');
          setCustomerData(inv.customer || {});
          setPlaceOfSupply(inv.placeOfSupply || inv.customer?.state || '');
          setItems(inv.items?.length ? inv.items : [EMPTY_ITEM()]);
          setNotes(inv.notes || '');
          setTerms(inv.terms || '');
          setBankDetails(inv.bankDetails || sets.bankDetails || {});
          if (inv.customer?.email || inv.customer?.phone) setShowContactDetails(true);
          loadedValues = extractInvoiceValues({
            invoiceNumber: inv.invoiceNumber || '',
            invoiceDate: inv.invoiceDate || getTodayInputDate(),
            dueDate: inv.dueDate || '',
            selectedCustomerId: inv.customerId ? String(inv.customerId) : '',
            customerData: inv.customer || {},
            placeOfSupply: inv.placeOfSupply || inv.customer?.state || '',
            items: inv.items?.length ? inv.items : [EMPTY_ITEM()],
            notes: inv.notes || '',
            terms: inv.terms || '',
            bankDetails: inv.bankDetails || sets.bankDetails || {},
          });
        }
      } else {
        const invNum  = nextNum;
        const defNotes= sets.defaultNotes;
        const defTerms= sets.defaultTerms;
        const defBank = sets.bankDetails || {};
        setInvoiceNumber(invNum);
        setNotes(defNotes);
        setTerms(defTerms);
        if (sets.bankDetails) setBankDetails(defBank);
        loadedValues = extractInvoiceValues({
          invoiceNumber: invNum,
          invoiceDate: getTodayInputDate(),
          dueDate: '',
          selectedCustomerId: '',
          customerData: { name: '', gstin: '', address: '', state: '', phone: '', email: '' },
          placeOfSupply: '',
          items: [EMPTY_ITEM()],
          notes: defNotes,
          terms: defTerms,
          bankDetails: defBank,
        });
      }
      // Set baseline so the form starts clean after load
      if (loadedValues) setBaseline(loadedValues);
    } catch (err) {
      console.error(err);
      setErrors({ global: err.message || 'Failed to load editor.' });
    } finally {
      setLoading(false);
    }
  };

  // Place of supply tax determination
  const effectivePos = placeOfSupply || customerData.state || business?.state || '';
  const taxType      = determineTaxType(business?.state, effectivePos);
  const isInterState = taxType === 'INTER';
  const calc         = useMemo(() => calculateInvoiceTotal(items, taxType), [items, taxType]);

  // Place of supply hint: show nothing until state chosen; compare with business state if available
  const placeOfSupplyHint = useMemo(() => {
    if (!placeOfSupply) return undefined;
    if (!business?.state) return undefined;
    const isInter = placeOfSupply.toLowerCase().trim() !== business.state.toLowerCase().trim();
    return isInter ? 'Inter-state: IGST' : 'Intra-state: CGST + SGST';
  }, [placeOfSupply, business?.state]);

  // Invoice empty check for disabling Print and PDF buttons
  const isInvoiceEmpty = !customerData.name?.trim() && (calc.grandTotal ?? 0) === 0;

  // Customer selection
  const handleSelectCustomer = c => {
    setSelectedCustomerId(String(c._id || c.id || ''));
    const normalizedType = normalizeCustomerType(c.customerType || (c.gstin ? 'registered' : 'unregistered'));
    setCustomerData({
      name: c.name || '',
      gstin: normalizedType === 'registered' ? (c.gstin || '') : '',
      customerType: normalizedType,
      address: c.address || '',
      state: c.state || '',
      phone: c.phone || '',
      email: c.email || ''
    });
    if (c.state) setPlaceOfSupply(c.state);
    if (c.email || c.phone) setShowContactDetails(true);
    setErrors(p => ({ ...p, customerName: null, placeOfSupply: null, gstin: null }));
  };

  const handleCustomerNameChange = name => {
    setSelectedCustomerId('');
    setCustomerData(p => ({ ...p, name }));
    setErrors(p => ({ ...p, customerName: null }));
  };

  // Quick-add customer from invoice combobox
  const handleQuickAddCustomer = useCallback((prefillName) => {
    setCustomerDrawerName(prefillName);
    setCustomerDrawerOpen(true);
  }, []);

  const handleSavedQuickCustomer = useCallback(async (formData) => {
    try {
      const res = await customersApi.create(formData);
      const saved = res?.data || formData;
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      handleSelectCustomer(saved);
      setCustomerDrawerOpen(false);
      return res;
    } catch (err) {
      if (err.code === 'DUPLICATE_GSTIN') {
        const details = err.details || err.fields || {};
        if (details.existingId) {
          try {
            const existingRes = await customersApi.get(details.existingId);
            const existingCust = existingRes?.data;
            if (existingCust) {
              await queryClient.invalidateQueries({ queryKey: ['customers'] });
              handleSelectCustomer(existingCust);
              setCustomerDrawerOpen(false);
              return existingRes;
            }
          } catch (getErr) {
            console.error('Failed to get existing customer on DUPLICATE_GSTIN:', getErr);
          }
        }
      }
      throw err;
    }
  }, [handleSelectCustomer, queryClient]); // eslint-disable-line react-hooks/exhaustive-deps

  // Items
  const handleItemChange = useCallback((idx, field, value) => {
    setItems(prev => { const n = [...prev]; n[idx] = { ...n[idx], [field]: value }; return n; });
    setErrors(p => { const c = { ...p }; delete c[`item_${idx}_${field}`]; delete c.items; return c; });
  }, []);

  const handleAddItem = () => {
    setItems(prev => {
      const next = [...prev, EMPTY_ITEM()];
      setTimeout(() => { const el = itemDescriptionRefs.current[next.length - 1]; if (el) el.focus(); }, 50);
      return next;
    });
  };

  const handleRemoveItem = idx => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSelectProduct = prod => {
    const newItem = {
      description: prod.name ? `${prod.name}${prod.description ? `\n${prod.description}` : ''}` : '',
      hsnSac: prod.hsnSac || '', quantity: '1', unit: prod.unit || 'Nos',
      rate: String(prod.rate ?? prod.unitPrice ?? 0), discount: 0, gstRate: prod.gstRate ?? 18,
    };
    if (items.length === 1 && !items[0].description && !items[0].rate) setItems([newItem]);
    else setItems(prev => [...prev, newItem]);
  };

  // Payload
  const buildPayload = (targetStatus = status) => ({
    invoiceNumber: invoiceNumber.trim(), invoiceDate, dueDate, status: targetStatus,
    customerId: selectedCustomerId ? (isNaN(selectedCustomerId) ? selectedCustomerId : Number(selectedCustomerId)) : null,
    customer: customerData, business: business || {}, placeOfSupply: effectivePos, taxType,
    items: calc.items, taxableAmount: calc.taxableAmount, cgst: calc.cgst, sgst: calc.sgst,
    igst: calc.igst, totalTax: calc.totalTax, grandTotal: calc.grandTotal,
    roundOff: calc.roundOff, netTotal: calc.netTotal, notes, terms, bankDetails,
  });

  // Validation
  const validateForm = (isDraft = false) => {
    const errs = {};
    if (!invoiceNumber.trim()) errs.invoiceNumber = 'Invoice number is required.';
    if (!invoiceDate)          errs.invoiceDate   = 'Invoice date is required.';
    if (!isDraft) {
      if (!customerData.name?.trim()) errs.customerName = 'Customer name is required.';
      if (!effectivePos)              errs.placeOfSupply = 'Place of supply is required.';
      if (customerData.gstin?.trim() && normalizeCustomerType(customerData.customerType) === 'registered') {
        const g = validateGSTIN(customerData.gstin);
        if (!g.isValid) errs.gstin = g.message || 'Invalid GSTIN format.';
      }
      if (!items.length) {
        errs.items = 'At least one item is required.';
      } else {
        items.forEach((item, idx) => {
          if (!item.description?.trim()) errs[`item_${idx}_description`] = 'Required.';
          if (isNaN(parseFloat(item.quantity)) || parseFloat(item.quantity) <= 0) errs[`item_${idx}_quantity`] = '> 0';
          if (isNaN(parseFloat(item.rate))     || parseFloat(item.rate)     < 0) errs[`item_${idx}_rate`]     = '≥ 0';
        });
      }
    }
    setErrors(errs);
    const firstKey = Object.keys(errs)[0];
    if (firstKey) {
      const map = { customerName: 'customer-name', placeOfSupply: 'place-of-supply', invoiceNumber: 'invoice-number', invoiceDate: 'invoice-date' };
      const el  = document.getElementById(map[firstKey] || firstKey);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus(); }
      return false;
    }
    return true;
  };

  // Actions
  const handleSave = async targetStatus => {
    if (!validateForm(targetStatus === 'Draft')) return;
    try {
      setSaving(true);
      setErrors({});
      const payload = buildPayload(targetStatus);
      let savedId   = invoiceId;

      if (isEditing) {
        await invoicesApi.updateDraft(invoiceId, payload);
      } else {
        const res = await invoicesApi.createDraft(payload);
        savedId = res?.data?._id || res?.data?.id;
      }

      // If issuing, call atomic issue endpoint to assign number and lock
      if (targetStatus === 'Issued') {
        await invoicesApi.issue(savedId);
      }

      // Reset dirty state — navigate to details
      resetBaseline(invoiceFormValues);
      markSaved();
      bypassNavRef.current = true;
      onNavigate('invoice-details', savedId);
    } catch (err) {
      console.error('Invoice save failed:', err);
      if (err.fields && typeof err.fields === 'object' && Object.keys(err.fields).length > 0) {
        // Map 422 and 400 server validation errors directly to form fields
        setErrors(err.fields);
        const firstKey = Object.keys(err.fields)[0];
        if (firstKey) {
          const el = document.getElementById(firstKey.replace(/\./g, '-')) || document.getElementById(firstKey);
          el?.focus();
        }
      } else {
        setErrors({ global: err.message || 'Failed to save invoice.' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (isDirty) {
      setPendingNavigation(() => () => onNavigate('invoices'));
      setShowLeaveDialog(true);
    } else {
      onNavigate('invoices');
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const { generateInvoicePDF } = await import('../pdf/generateInvoicePDF');
      generateInvoicePDF(buildPayload(), { action: 'download' });
    } catch (err) {
      console.error(err);
      setErrors(p => ({ ...p, global: 'Failed to generate PDF. Please try again.' }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 bg-bg text-text">
        <div className="w-7 h-7 rounded-full border-2 border-border border-t-accent animate-spin" />
        <p className="text-sm text-muted">Preparing invoice editor…</p>
      </div>
    );
  }

  if (errors.global) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 bg-bg text-text px-4">
        <div className="flex items-center gap-2 text-danger">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{errors.global}</p>
        </div>
        <button
          type="button"
          onClick={() => { setErrors({}); setLoading(true); loadSetupData(); }}
          className="text-sm px-4 py-2 rounded-lg border border-border bg-surface hover:bg-border transition-colors cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  const missingBizInfo = !business?.businessName || !business?.gstin;

  return (
    <div className="w-full bg-bg text-text font-sans pb-28 lg:pb-12">

      {/* ══ STICKY HEADER AREA (Reduced vertical padding, sticky below mobile top bar) ══ */}
      <header className="sticky top-14 md:top-0 z-30 bg-surface border-b border-border">
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6">

          {/* Row 1: Back + Title + Status + Action buttons */}
          <div className="flex items-center justify-between gap-2 sm:gap-4 py-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                type="button"
                onClick={handleBack}
                aria-label="Back to invoices"
                className="w-8 h-8 shrink-0 rounded-full border border-border bg-bg hover:bg-border text-text flex items-center justify-center transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="min-w-0">
                <p className="text-xs text-muted leading-none mb-0.5 truncate">Invoices / {isEditing ? 'Edit' : 'New'}</p>
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <h1 className="text-base sm:text-[20px] font-semibold text-text leading-tight tracking-tight truncate">
                    {isEditing ? 'Edit invoice' : 'New GST invoice'}
                  </h1>
                  <span className="text-[11px] sm:text-xs font-medium px-2 py-0.5 rounded-full bg-border text-muted shrink-0">
                    {status}
                  </span>
                  {/* Dirty / Saved indicator */}
                  {isJustSaved ? (
                    <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-success shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-success" />Saved
                    </span>
                  ) : isDirty ? (
                    <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-warning shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />Unsaved changes
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleSave('Draft')}
                disabled={saving}
                aria-label="Save draft"
                className="h-8 px-2.5 sm:px-3 text-xs shrink-0 flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Save draft</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleSave('Issued')}
                disabled={saving}
                aria-label="Save and issue"
                className="h-8 px-2.5 sm:px-3 text-xs whitespace-nowrap shrink-0"
              >
                {saving ? 'Saving…' : (
                  <>
                    <span className="hidden sm:inline">Save & issue</span>
                    <span className="sm:hidden">Issue</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Row 2: Invoice no., Date, Due date: grid-cols-2 on sm, grid-cols-1 below, all inputs w-full, no wrapped labels */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 py-2 border-t border-border">
            <div className="w-full">
              <label htmlFor="invoice-number" className="block text-[13px] font-medium text-muted mb-1 whitespace-nowrap">
                Invoice no.
              </label>
              <div className="w-full">
                <Input
                  id="invoice-number"
                  type="text"
                  value={invoiceNumber}
                  placeholder="INV/001"
                  error={errors.invoiceNumber}
                  className="w-full"
                  onChange={e => { setInvoiceNumber(e.target.value); setErrors(p => ({ ...p, invoiceNumber: null })); }}
                />
              </div>
              {errors.invoiceNumber && <p className="mt-1 text-xs text-danger">{errors.invoiceNumber}</p>}
            </div>

            <div className="w-full">
              <label htmlFor="invoice-date" className="block text-[13px] font-medium text-muted mb-1 whitespace-nowrap">
                Date
              </label>
              <div className="w-full">
                <DateInput
                  id="invoice-date"
                  value={invoiceDate}
                  error={errors.invoiceDate}
                  className="w-full"
                  onChange={v => { setInvoiceDate(v); setErrors(p => ({ ...p, invoiceDate: null })); }}
                />
              </div>
              {errors.invoiceDate && <p className="mt-1 text-xs text-danger">{errors.invoiceDate}</p>}
            </div>

            <div className="w-full sm:col-span-2 lg:col-span-1">
              <label htmlFor="due-date" className="block text-[13px] font-medium text-muted mb-1 whitespace-nowrap">
                Due date <span className="text-xs font-normal text-faint">(optional)</span>
              </label>
              <div className="w-full">
                <DateInput
                  id="due-date"
                  value={dueDate}
                  placeholder="DD/MM/YYYY"
                  className="w-full"
                  onChange={v => { setDueDate(v); }}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ══ NOTICES & ERRORS (Reduced vertical gap) ═══════════════════════════ */}
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 space-y-2 mt-2.5">
        {errors.global && (
          <div className="flex items-center gap-2 rounded-lg border border-danger bg-surface px-4 py-2.5 text-sm text-danger">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {errors.global}
          </div>
        )}
        {missingBizInfo && !noticeDismissed && (
          <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-2 text-sm gap-3">
            <div className="flex items-center gap-2">
              <span className="text-muted">Add your business name and GSTIN so they appear on invoices.</span>
              <button
                type="button"
                onClick={() => onNavigate('settings')}
                className="underline font-medium text-accent hover:opacity-80 cursor-pointer"
              >
                Open settings
              </button>
            </div>
            <button
              type="button"
              onClick={() => setNoticeDismissed(true)}
              className="text-muted hover:text-text p-1 cursor-pointer shrink-0"
              aria-label="Dismiss notice"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ══ SHARED GRID: FORM + SUMMARY (Right edge aligned, no gap-8 overflow) ═ */}
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 py-3">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-6 lg:gap-8 items-start">

          {/* ── FORM ON A SINGLE SURFACE ────────────────────────────────────── */}
          <div className="min-w-0 w-full">
            {/* The form width container (@container/form) for responsive item rows */}
            <div className="@container/form bg-surface rounded-xl border border-border p-4 sm:p-6 space-y-8">

              {/* 1. CUSTOMER SECTION */}
              <div className="space-y-4">
                <SectionHeading>Customer</SectionHeading>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name */}
                  <Field label="Name" htmlFor="customer-name" error={errors.customerName}>
                    <CustomerCombobox
                      id="customer-name"
                      value={customerData.name}
                      onChange={handleCustomerNameChange}
                      onSelectCustomer={handleSelectCustomer}
                      error={Boolean(errors.customerName)}
                      onQuickAdd={handleQuickAddCustomer}
                    />
                  </Field>

                  {/* Place of supply: dimmed placeholder color until state chosen; hint only after chosen */}
                  <Field
                    label="Place of supply"
                    htmlFor="place-of-supply"
                    error={errors.placeOfSupply}
                    helper={placeOfSupplyHint}
                  >
                    <Select
                      id="place-of-supply"
                      value={placeOfSupply}
                      className={!placeOfSupply ? 'text-faint' : 'text-text'}
                      error={Boolean(errors.placeOfSupply)}
                      onChange={e => {
                        setPlaceOfSupply(e.target.value);
                        setCustomerData(p => ({ ...p, state: e.target.value }));
                        setErrors(p => ({ ...p, placeOfSupply: null }));
                      }}
                    >
                      <option value="" className="text-faint">Select state</option>
                      {INDIAN_STATES.map(s => (
                        <option key={s.code} value={s.name} className="text-text">{s.code} — {s.name}</option>
                      ))}
                    </Select>
                  </Field>

                  {/* GSTIN (optional) */}
                  <Field
                    label="GSTIN"
                    htmlFor="customer-gstin"
                    optional
                    error={errors.gstin}
                    helper={!errors.gstin && !customerData.gstin ? 'Skip for unregistered customers' : undefined}
                  >
                    <Input
                      id="customer-gstin"
                      type="text"
                      maxLength={15}
                      value={customerData.gstin}
                      placeholder="27AAAAA0000A1Z5"
                      error={errors.gstin}
                      onChange={e => {
                        setCustomerData(p => ({ ...p, gstin: e.target.value.toUpperCase() }));
                        setErrors(p => ({ ...p, gstin: null }));
                      }}
                    />
                  </Field>

                  {/* Address (optional) */}
                  <Field label="Address" htmlFor="customer-address" optional>
                    <Textarea
                      id="customer-address"
                      rows={2}
                      value={customerData.address}
                      placeholder="Street, City, PIN"
                      onChange={e => { setCustomerData(p => ({ ...p, address: e.target.value })); }}
                    />
                  </Field>
                </div>

                {/* Collapsible contact details */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowContactDetails(p => !p)}
                    className="text-xs font-medium text-accent hover:underline cursor-pointer"
                  >
                    {showContactDetails ? '— Hide contact details' : '+ Add email or phone'}
                  </button>

                  {showContactDetails && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
                      <Field label="Email" htmlFor="customer-email" optional>
                        <Input
                          id="customer-email"
                          type="email"
                          value={customerData.email || ''}
                          placeholder="billing@customer.com"
                          onChange={e => { setCustomerData(p => ({ ...p, email: e.target.value })); }}
                        />
                      </Field>
                      <Field label="Phone" htmlFor="customer-phone" optional>
                        <Input
                          id="customer-phone"
                          type="tel"
                          value={customerData.phone || ''}
                          placeholder="+91 98765 43210"
                          onChange={e => { setCustomerData(p => ({ ...p, phone: e.target.value })); }}
                        />
                      </Field>
                    </div>
                  )}
                </div>
              </div>

              {/* 1px divider */}
              <Divider />

              {/* 2. ITEMS SECTION */}
              <div className="space-y-4">
                <SectionHeading
                  action={
                    <button
                      type="button"
                      onClick={() => setShowProductPicker(true)}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-surface hover:bg-border text-xs font-medium text-text transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-accent" />
                      <span>Pick from catalog</span>
                    </button>
                  }
                >
                  Items
                </SectionHeading>

                {errors.items && (
                  <div className="flex items-center gap-2 rounded-lg border border-danger bg-bg px-3 py-2 text-xs text-danger">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.items}
                  </div>
                )}

                {/* Desktop column header row (aligned flush with Items heading, no extra left indent) */}
                <ItemsHeader />

                {/* Rows: compact single line on desktop, stacked on mobile */}
                <div className="space-y-1">
                  {items.map((item, idx) => (
                    <ItemRow
                      key={idx}
                      item={item}
                      idx={idx}
                      totalRows={items.length}
                      errors={errors}
                      onChange={handleItemChange}
                      onRemove={handleRemoveItem}
                    />
                  ))}
                </div>

                {/* Full-width dashed Add item button directly under last row */}
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-dashed border-border text-sm font-medium text-muted hover:text-text hover:border-accent transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add item
                </button>
              </div>

              {/* 1px divider */}
              <Divider />

              {/* 3. NOTE SECTION (heading only, no duplicate inner label; optional as placeholder hint) */}
              <div className="space-y-4">
                <SectionHeading>Note</SectionHeading>
                <Textarea
                  id="invoice-note"
                  rows={2}
                  value={notes}
                  placeholder="Thank you for your business! (optional)"
                  onChange={e => { setNotes(e.target.value); }}
                />
              </div>

            </div>
          </div>

          {/* ── SUMMARY COLUMN (360px in grid, no extra margin or max-width) ── */}
          <aside className="w-full lg:sticky lg:top-24 space-y-4">
            <TotalsPanel
              calc={calc}
              isInterState={isInterState}
              isInvoiceEmpty={isInvoiceEmpty}
              onPrint={() => window.print()}
              onDownloadPdf={handleDownloadPdf}
              onFullPreview={() => setShowPreviewModal(true)}
            />
          </aside>

        </div>
      </div>

      {/* ══ MOBILE BOTTOM BAR (HIDDEN WHEN MAIN >= 1000PX) ═══════════════════ */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-border px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] flex items-center justify-between gap-3 shadow-lg">
        <div>
          <span className="text-xs text-muted block">Grand total</span>
          <span className="text-base font-semibold text-accent tabular-nums">
            {formatCurrency(calc.grandTotal ?? 0)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowPreviewModal(true)}>
            <Eye className="w-3.5 h-3.5" /> Preview
          </Button>
          <Button variant="primary" size="sm" onClick={() => handleSave('Issued')} disabled={saving}>
            {saving ? 'Saving…' : 'Issue'}
          </Button>
        </div>
      </div>

      {/* ══ PREVIEW MODAL ═════════════════════════════════════════════════════ */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl">
            <PreviewSheet
              payload={buildPayload()}
              calc={calc}
              onClose={() => setShowPreviewModal(false)}
            />
          </div>
        </div>
      )}

      {/* ══ PRODUCT PICKER MODAL ═════════════════════════════════════════════ */}
      {showProductPicker && (
        <ProductPickerModal
          onSelect={prod => { handleSelectProduct(prod); setShowProductPicker(false); }}
          onClose={() => setShowProductPicker(false)}
        />
      )}

      {/* ══ QUICK-ADD CUSTOMER DRAWER ════════════════════════════════════════ */}
      <CustomerDrawer
        isOpen={customerDrawerOpen}
        onClose={() => setCustomerDrawerOpen(false)}
        onSave={handleSavedQuickCustomer}
        prefillName={customerDrawerName}
      />

      {/* ══ LEAVE WITHOUT SAVING DIALOG ══════════════════════════════════════ */}
      <ConfirmDialog
        isOpen={showLeaveDialog}
        title="Leave without saving?"
        description="Your changes to this invoice will be lost."
        confirmLabel="Leave"
        cancelLabel="Keep editing"
        destructive
        onConfirm={() => {
          setShowLeaveDialog(false);
          bypassNavRef.current = true;
          pendingNavigation?.();
          setPendingNavigation(null);
        }}
        onCancel={() => {
          setShowLeaveDialog(false);
          setPendingNavigation(null);
        }}
      />
    </div>
  );
}

export default CreateInvoice;
