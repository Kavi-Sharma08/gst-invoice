import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  ArrowLeft,
  AlertCircle,
  Trash2,
  Plus,
  Printer,
  Download,
  ChevronDown,
  Sparkles
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { invoicesApi } from '../api/invoices.api';
import { businessApi } from '../api/business.api';
import { customersApi } from '../api/customers.api';
import { productsApi } from '../api/products.api';

import { determineTaxType, calculateInvoiceTotal, calculateItemTotal } from '../gst/calculateGST';
import { validateGSTIN } from '../gst/validateGSTIN';
import { generateNextInvoiceNumber, isDuplicateInvoiceNumber } from '../utils/invoiceNumber';
import { getTodayInputDate, formatDate } from '../utils/date';
import { formatCurrency, numberToWords } from '../utils/currency';
import { INDIAN_STATES, GST_RATES, getStateByName, getStateByCode } from '../gst/taxRules';
import { useAppNavigate } from '../utils/navigation';
import { ProductPickerModal } from '../components/invoice/ProductPickerModal';

/**
 * Fast, inline Customer Combobox:
 * Type to enter a customer name or pick from existing directory.
 * Selecting a customer automatically populates GSTIN, address, state, phone and email.
 */
function CustomerCombobox({
  value,
  onChange,
  onSelectCustomer,
  customers = [],
  error,
  id = 'customer-name'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const filtered = useMemo(() => {
    if (!value || !value.trim()) return customers.slice(0, 10);
    const q = value.toLowerCase().trim();
    return customers
      .filter(
        (c) =>
          (c.name && c.name.toLowerCase().includes(q)) ||
          (c.gstin && c.gstin.toLowerCase().includes(q)) ||
          (c.phone && c.phone.includes(q))
      )
      .slice(0, 10);
  }, [customers, value]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Type customer name or choose from list"
          autoComplete="off"
          className={`w-full h-12 rounded-[10px] bg-[#0F1116] border ${
            error ? 'border-rose-500' : 'border-[#2B3040]'
          } px-3.5 text-[15px] text-[#F2F4F8] placeholder-[#8B94A8] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-[#4F46E5] transition-all`}
        />
        {customers.length > 0 && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setIsOpen(!isOpen)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B94A8] hover:text-[#F2F4F8] p-1 cursor-pointer"
            aria-label="Toggle saved customers"
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {isOpen && filtered.length > 0 && (
        <ul
          className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-[10px] bg-[#14161C] border border-[#2B3040] shadow-2xl py-1 text-xs"
          role="listbox"
        >
          {filtered.map((c) => (
            <li
              key={c._id || c.id}
              role="option"
              onClick={() => {
                onSelectCustomer(c);
                setIsOpen(false);
              }}
              className="px-3.5 py-2.5 hover:bg-[#1F1F23] cursor-pointer flex items-center justify-between transition-colors border-b border-[#232733] last:border-0"
            >
              <div>
                <div className="font-semibold text-[#F2F4F8] text-[13px]">{c.name}</div>
                <div className="text-[11px] text-[#8B94A8] mt-0.5">
                  {c.gstin ? `GSTIN: ${c.gstin}` : 'Unregistered (B2C)'}
                  {c.state ? ` · ${c.state}` : ''}
                </div>
              </div>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-[#1F1F23] text-[#818CF8]">
                Select
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function CreateInvoice({ invoiceId: propInvoiceId, onNavigate: propOnNavigate }) {
  const params = useParams();
  const appNavigate = useAppNavigate();
  const onNavigate = propOnNavigate || appNavigate;
  const invoiceId = propInvoiceId || params.id;
  const isEditing = Boolean(invoiceId);
  const { isAuthenticated } = useAuth();

  // Loading & submit states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState('editor'); // 'editor' | 'preview'
  const [errors, setErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  const [showContactDetails, setShowContactDetails] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);

  // Business & Customers & Settings from DB
  const [business, setBusiness] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [existingInvoices, setExistingInvoices] = useState([]);
  const [settings, setSettings] = useState(null);

  // Core Form State
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(getTodayInputDate());
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState('Draft');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerData, setCustomerData] = useState({
    name: '',
    gstin: '',
    address: '',
    state: '',
    phone: '',
    email: ''
  });
  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const [items, setItems] = useState([
    {
      description: '',
      hsnSac: '',
      quantity: 1,
      unit: 'Nos',
      rate: 0,
      discount: 0,
      gstRate: 18
    }
  ]);
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');
  const [bankDetails, setBankDetails] = useState({
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    branch: '',
    upiId: ''
  });

  // Ref array for item description inputs to support auto-focus on new row
  const itemDescriptionRefs = useRef([]);

  // Warn on unsaved changes before leaving
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty && !saving) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, saving]);

  // Load initial setup data
  useEffect(() => {
    loadSetupData();
  }, [invoiceId, isAuthenticated]);

  const loadSetupData = async () => {
    try {
      setLoading(true);
      const [bRes, cRes, iRes] = await Promise.all([
        businessApi.get(),
        customersApi.list({ limit: 100 }),
        invoicesApi.list({ limit: 100 })
      ]);

      const biz = bRes?.data || null;
      const custList = Array.isArray(cRes?.data) ? cRes.data : (cRes?.data?.customers || []);
      const invList = Array.isArray(iRes?.data) ? iRes.data : (iRes?.data?.invoices || []);

      const sets = {
        invoicePrefix: biz?.invoiceSettings?.invoicePrefix || 'INV/',
        startingNumber: biz?.invoiceSettings?.startingNumber || 1,
        defaultNotes: biz?.invoiceSettings?.defaultNotes || 'Thank you for your business!',
        defaultTerms: biz?.invoiceSettings?.defaultTerms || 'Payment due within 15 days.',
        bankDetails: biz?.bankDetails || {}
      };

      setBusiness(biz);
      setCustomers(custList);
      setExistingInvoices(invList);
      setSettings(sets);

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
          setItems(inv.items?.length ? inv.items : []);
          setNotes(inv.notes || '');
          setTerms(inv.terms || '');
          setBankDetails(inv.bankDetails || sets.bankDetails || {});
          if (inv.customer?.email || inv.customer?.phone) {
            setShowContactDetails(true);
          }
        }
      } else {
        const nextNum = generateNextInvoiceNumber(
          sets.invoicePrefix,
          sets.startingNumber,
          invList
        );
        setInvoiceNumber(nextNum);
        setNotes(sets.defaultNotes);
        setTerms(sets.defaultTerms);
        if (sets.bankDetails) {
          setBankDetails(sets.bankDetails);
        }
        setStatus('Draft');
      }
    } catch (err) {
      console.error('Failed to initialize invoice editor:', err);
      setErrors({ global: err.message || 'Failed to initialize invoice editor.' });
    } finally {
      setLoading(false);
    }
  };

  // Determine current tax type
  const effectivePlaceOfSupply = placeOfSupply || customerData.state || business?.state || '';
  const taxType = determineTaxType(business?.state, effectivePlaceOfSupply);

  // Compute live calculations in background
  const invoiceCalculation = useMemo(() => {
    return calculateInvoiceTotal(items, taxType);
  }, [items, taxType]);

  const handleSelectCustomer = (found) => {
    setIsDirty(true);
    setSelectedCustomerId(String(found._id || found.id || ''));
    setCustomerData({
      name: found.name || '',
      gstin: found.gstin || '',
      address: found.address || '',
      state: found.state || '',
      phone: found.phone || '',
      email: found.email || ''
    });
    if (found.state) {
      setPlaceOfSupply(found.state);
    }
    if (found.email || found.phone) {
      setShowContactDetails(true);
    }
    setErrors((prev) => ({ ...prev, customerName: null, placeOfSupply: null, gstin: null }));
  };

  const handleCustomerNameChange = (name) => {
    setIsDirty(true);
    setSelectedCustomerId('');
    setCustomerData((prev) => ({ ...prev, name }));
    setErrors((prev) => ({ ...prev, customerName: null }));
  };

  // Item row operations
  const handleItemChange = (index, field, value) => {
    setIsDirty(true);
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setItems(updated);
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy[`item_${index}_${field}`];
      delete copy.items;
      return copy;
    });
  };

  const handleAddItem = () => {
    setIsDirty(true);
    const newItems = [
      ...items,
      {
        description: '',
        hsnSac: '',
        quantity: 1,
        unit: 'Nos',
        rate: 0,
        discount: 0,
        gstRate: 18
      }
    ];
    setItems(newItems);
    setTimeout(() => {
      const idx = newItems.length - 1;
      if (itemDescriptionRefs.current[idx]) {
        itemDescriptionRefs.current[idx].focus();
      }
    }, 50);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) return;
    setIsDirty(true);
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
  };

  const handleSelectProduct = (prod) => {
    setIsDirty(true);
    const newItem = {
      description: prod.name ? `${prod.name}${prod.description ? `\n${prod.description}` : ''}` : '',
      hsnSac: prod.hsnSac || '',
      quantity: 1,
      unit: prod.unit || 'Nos',
      rate: prod.rate ?? prod.unitPrice ?? 0,
      discount: 0,
      gstRate: prod.gstRate ?? 18
    };

    if (items.length === 1 && !items[0].description && !items[0].rate) {
      setItems([newItem]);
    } else {
      setItems([...items, newItem]);
    }
  };

  // Build payload
  const buildInvoicePayload = (targetStatus = status) => {
    return {
      invoiceNumber: invoiceNumber.trim(),
      invoiceDate,
      dueDate,
      status: targetStatus,
      customerId: selectedCustomerId
        ? (isNaN(selectedCustomerId) ? selectedCustomerId : Number(selectedCustomerId))
        : null,
      customer: customerData,
      business: business || {},
      placeOfSupply: effectivePlaceOfSupply,
      taxType,
      items: invoiceCalculation.items,
      taxableAmount: invoiceCalculation.taxableAmount,
      cgst: invoiceCalculation.cgst,
      sgst: invoiceCalculation.sgst,
      igst: invoiceCalculation.igst,
      totalTax: invoiceCalculation.totalTax,
      grandTotal: invoiceCalculation.grandTotal,
      roundOff: invoiceCalculation.roundOff,
      netTotal: invoiceCalculation.netTotal,
      notes,
      terms,
      bankDetails
    };
  };

  // Validation on submit
  const validateForm = (isDraft = false) => {
    const newErrors = {};

    if (!invoiceNumber || !invoiceNumber.trim()) {
      newErrors.invoiceNumber = 'Invoice number is required.';
    }

    if (!invoiceDate) {
      newErrors.invoiceDate = 'Invoice date is required.';
    }

    // Only validate full requirements when issuing
    if (!isDraft) {
      if (!customerData.name || !customerData.name.trim()) {
        newErrors.customerName = 'Customer name is required.';
      }

      if (!effectivePlaceOfSupply) {
        newErrors.placeOfSupply = 'Place of supply (State) is required for GST determination.';
      }

      if (customerData.gstin && customerData.gstin.trim()) {
        const gstinCheck = validateGSTIN(customerData.gstin);
        if (!gstinCheck.isValid) {
          newErrors.gstin = gstinCheck.message || 'Invalid GSTIN format.';
        }
      }

      if (!items.length) {
        newErrors.items = 'At least one item is required.';
      } else {
        items.forEach((item, idx) => {
          if (!item.description || !item.description.trim()) {
            newErrors[`item_${idx}_description`] = 'Description is required.';
          }
          const qty = parseFloat(item.quantity);
          if (isNaN(qty) || qty <= 0) {
            newErrors[`item_${idx}_quantity`] = 'Qty must be > 0.';
          }
          const rate = parseFloat(item.rate);
          if (isNaN(rate) || rate < 0) {
            newErrors[`item_${idx}_rate`] = 'Rate must be >= 0.';
          }
        });
      }
    }

    setErrors(newErrors);

    // Focus & scroll to first error
    const errorKeys = Object.keys(newErrors);
    if (errorKeys.length > 0) {
      const firstKey = errorKeys[0];
      const elementId =
        firstKey === 'customerName'
          ? 'customer-name'
          : firstKey === 'placeOfSupply'
          ? 'place-of-supply'
          : firstKey === 'invoiceNumber'
          ? 'invoice-number'
          : firstKey === 'invoiceDate'
          ? 'invoice-date'
          : firstKey.startsWith('item_')
          ? firstKey
          : null;

      if (elementId) {
        const el = document.getElementById(elementId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.focus();
        }
      }
      return false;
    }

    return true;
  };

  const handleSave = async (targetStatus) => {
    const isDraft = targetStatus === 'Draft';
    const isValid = validateForm(isDraft);
    if (!isValid) return;

    // Check duplicate invoice number
    const finalNumber = invoiceNumber.trim();
    if (isDuplicateInvoiceNumber(finalNumber, invoiceId, existingInvoices)) {
      setErrors({ invoiceNumber: `Invoice number "${finalNumber}" already exists.` });
      const el = document.getElementById('invoice-number');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
      }
      return;
    }

    try {
      setSaving(true);
      const payload = buildInvoicePayload(targetStatus);

      let savedId = invoiceId;
      if (isEditing) {
        await invoicesApi.update(invoiceId, payload);
      } else {
        const res = await invoicesApi.create(payload);
        savedId = res?.data?._id || res?.data?.id;
      }

      setIsDirty(false);
      onNavigate('invoice-details', savedId);
    } catch (err) {
      console.error('Failed to save invoice:', err);
      setErrors({ global: err.message || 'Failed to save invoice. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (isDirty) {
      const confirmed = window.confirm('You have unsaved changes. Discard and return to invoices?');
      if (!confirmed) return;
    }
    onNavigate('invoices');
  };

  const handleDownloadPdf = async () => {
    try {
      const { generateInvoicePDF } = await import('../pdf/generateInvoicePDF');
      generateInvoicePDF(buildInvoicePayload(), { action: 'download' });
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Failed to generate invoice PDF.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center py-16 bg-[#0B0C10] text-[#F2F4F8]">
        <div className="w-8 h-8 rounded-full border-2 border-[#2B3040] border-t-[#4F46E5] animate-spin" />
        <p className="mt-3 text-xs text-[#8B94A8] font-medium">Preparing invoice editor...</p>
      </div>
    );
  }

  const isInterState = taxType === 'INTER';
  const supplierState = business?.state || '';
  const customerState = effectivePlaceOfSupply;

  return (
    <div className="min-h-screen bg-[#0B0C10] text-[#F2F4F8] font-sans">
      {/* ── 1. HEADER (sticky top bar) ────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#0F1116] border-b border-[#232733] px-4 sm:px-6 py-3">
        <div className="max-w-[880px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left: Back button + Breadcrumb + Title + Status chip */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={handleBack}
              aria-label="Back to invoices"
              className="w-9 h-9 shrink-0 rounded-full border border-[#2B3040] bg-[#14161C] hover:bg-[#1F1F23] text-[#F2F4F8] flex items-center justify-center transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="text-[11px] text-[#8B94A8] font-medium leading-none mb-1">
                Invoices / {isEditing ? 'Edit' : 'New'}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-semibold text-[#F2F4F8] tracking-tight leading-tight">
                  {isEditing ? 'Edit GST tax invoice' : 'New GST tax invoice'}
                </h1>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#1E1B4B] text-[#A5B4FC] border border-[#4F46E5]/40 leading-none">
                  {status || 'Draft'}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Segmented Editor/Preview toggle + Action buttons */}
          <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
            {/* Segmented Toggle: Editor | Preview */}
            <div className="inline-flex p-1 bg-[#14161C] border border-[#232733] rounded-[10px] text-xs">
              <button
                type="button"
                onClick={() => setViewMode('editor')}
                className={`px-3 py-1.5 rounded-[8px] font-medium transition-all cursor-pointer ${
                  viewMode === 'editor'
                    ? 'bg-[#27272A] text-[#FAFAFA] font-semibold shadow-xs'
                    : 'text-[#8B94A8] hover:text-[#FAFAFA]'
                }`}
              >
                Editor
              </button>
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className={`px-3 py-1.5 rounded-[8px] font-medium transition-all cursor-pointer ${
                  viewMode === 'preview'
                    ? 'bg-[#27272A] text-[#FAFAFA] font-semibold shadow-xs'
                    : 'text-[#8B94A8] hover:text-[#FAFAFA]'
                }`}
              >
                Preview
              </button>
            </div>

            {/* Secondary Action: Save draft */}
            <button
              type="button"
              onClick={() => handleSave('Draft')}
              disabled={saving}
              className="h-9 px-3.5 rounded-[10px] text-xs sm:text-sm font-medium border border-[#2B3040] bg-transparent text-[#F2F4F8] hover:bg-[#1F1F23] disabled:opacity-50 cursor-pointer transition-colors"
            >
              Save draft
            </button>

            {/* Primary Action: Save & issue */}
            <button
              type="button"
              onClick={() => handleSave('Issued')}
              disabled={saving}
              className="h-9 px-4 rounded-[10px] text-xs sm:text-sm font-semibold bg-[#4F46E5] text-white hover:bg-[#4338CA] disabled:opacity-50 cursor-pointer transition-all shadow-xs"
            >
              {saving ? 'Saving...' : 'Save & issue'}
            </button>
          </div>
        </div>
      </header>

      {/* ── 2. MAIN LAYOUT (Single centered column, max-w 880px) ───────────────── */}
      <main className="max-w-[880px] mx-auto px-4 sm:px-6 md:px-8 py-6 space-y-4">
        {errors.global && (
          <div className="bg-rose-500/15 border border-rose-500/30 text-[#F87171] rounded-xl px-4 py-3 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errors.global}</span>
          </div>
        )}

        {/* ── 3. WARNING STRIP (Slim one-line if business profile missing) ─────── */}
        {(!business?.businessName || !business?.gstin) && (
          <div className="bg-[#2A2113] border border-[#5A4416] text-[#F5D79A] rounded-xl px-4 py-2.5 flex items-center justify-between text-xs gap-3">
            <span>Add your business name and GSTIN to show them on invoices.</span>
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className="underline font-semibold hover:text-white cursor-pointer shrink-0"
            >
              Open settings
            </button>
          </div>
        )}

        {/* ── VIEW 1: EDITOR MODE ────────────────────────────────────────────── */}
        {viewMode === 'editor' && (
          <div className="space-y-4">
            {/* ── 4. SECTION: INVOICE INFO (compact card, 3 columns) ─────────── */}
            <section className="bg-[#14161C] border border-[#232733] rounded-2xl p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Invoice No. */}
                <div>
                  <label
                    htmlFor="invoice-number"
                    className="block text-[13px] font-medium text-[#C5CBDA] mb-1.5"
                  >
                    Invoice no. <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="invoice-number"
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => {
                      setIsDirty(true);
                      setInvoiceNumber(e.target.value);
                      setErrors((prev) => ({ ...prev, invoiceNumber: null }));
                    }}
                    placeholder="INV/26-27/001"
                    className={`w-full h-12 rounded-[10px] bg-[#0F1116] border ${
                      errors.invoiceNumber ? 'border-rose-500' : 'border-[#2B3040]'
                    } px-3.5 text-[15px] font-mono text-[#F2F4F8] placeholder-[#8B94A8] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-[#4F46E5]`}
                  />
                  {errors.invoiceNumber && (
                    <p className="mt-1 text-xs text-[#F87171] flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {errors.invoiceNumber}
                    </p>
                  )}
                </div>

                {/* Date */}
                <div>
                  <label
                    htmlFor="invoice-date"
                    className="block text-[13px] font-medium text-[#C5CBDA] mb-1.5"
                  >
                    Date <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="invoice-date"
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => {
                      setIsDirty(true);
                      setInvoiceDate(e.target.value);
                      setErrors((prev) => ({ ...prev, invoiceDate: null }));
                    }}
                    style={{ colorScheme: 'dark' }}
                    className={`w-full h-12 rounded-[10px] bg-[#0F1116] border ${
                      errors.invoiceDate ? 'border-rose-500' : 'border-[#2B3040]'
                    } px-3.5 text-[15px] text-[#F2F4F8] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-[#4F46E5]`}
                  />
                  {errors.invoiceDate && (
                    <p className="mt-1 text-xs text-[#F87171] flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {errors.invoiceDate}
                    </p>
                  )}
                </div>

                {/* Due Date */}
                <div>
                  <label
                    htmlFor="due-date"
                    className="block text-[13px] font-medium text-[#C5CBDA] mb-1.5"
                  >
                    Due date <span className="text-[#8B94A8] font-normal text-xs">(optional)</span>
                  </label>
                  <input
                    id="due-date"
                    type="date"
                    value={dueDate}
                    onChange={(e) => {
                      setIsDirty(true);
                      setDueDate(e.target.value);
                    }}
                    style={{ colorScheme: 'dark' }}
                    placeholder="Immediate"
                    className="w-full h-12 rounded-[10px] bg-[#0F1116] border border-[#2B3040] px-3.5 text-[15px] text-[#F2F4F8] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-[#4F46E5]"
                  />
                  <p className="text-[11px] text-[#8B94A8] mt-1">Empty means "Immediate"</p>
                </div>
              </div>
            </section>

            {/* ── 5. SECTION: CUSTOMER (card with heading "Customer") ─────────── */}
            <section className="bg-[#14161C] border border-[#232733] rounded-2xl p-6 space-y-4">
              <h2 className="text-base font-semibold text-[#F2F4F8] tracking-tight">Customer</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Customer Name Combobox */}
                <div>
                  <label
                    htmlFor="customer-name"
                    className="block text-[13px] font-medium text-[#C5CBDA] mb-1.5"
                  >
                    Name <span className="text-rose-400">*</span>
                  </label>
                  <CustomerCombobox
                    id="customer-name"
                    value={customerData.name}
                    onChange={handleCustomerNameChange}
                    onSelectCustomer={handleSelectCustomer}
                    customers={customers}
                    error={Boolean(errors.customerName)}
                  />
                  {errors.customerName && (
                    <p className="mt-1 text-xs text-[#F87171] flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {errors.customerName}
                    </p>
                  )}
                </div>

                {/* Place of Supply (State select) */}
                <div>
                  <label
                    htmlFor="place-of-supply"
                    className="block text-[13px] font-medium text-[#C5CBDA] mb-1.5"
                  >
                    Place of supply <span className="text-rose-400">*</span>
                  </label>
                  <select
                    id="place-of-supply"
                    value={effectivePlaceOfSupply}
                    onChange={(e) => {
                      setIsDirty(true);
                      setPlaceOfSupply(e.target.value);
                      setCustomerData((prev) => ({ ...prev, state: e.target.value }));
                      setErrors((prev) => ({ ...prev, placeOfSupply: null }));
                    }}
                    className={`w-full h-12 rounded-[10px] bg-[#0F1116] border ${
                      errors.placeOfSupply ? 'border-rose-500' : 'border-[#2B3040]'
                    } px-3.5 text-[15px] text-[#F2F4F8] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-[#4F46E5] cursor-pointer`}
                  >
                    <option value="" className="bg-[#14161C] text-[#8B94A8]">
                      -- Select State --
                    </option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s.code} value={s.name} className="bg-[#14161C] text-[#F2F4F8]">
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                  {errors.placeOfSupply ? (
                    <p className="mt-1 text-xs text-[#F87171] flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {errors.placeOfSupply}
                    </p>
                  ) : (
                    <p className="text-[11px] text-[#8B94A8] mt-1">
                      {isInterState ? 'Inter-State → IGST' : 'Intra-State → CGST + SGST'}
                    </p>
                  )}
                </div>

                {/* GSTIN */}
                <div>
                  <label
                    htmlFor="customer-gstin"
                    className="block text-[13px] font-medium text-[#C5CBDA] mb-1.5"
                  >
                    GSTIN <span className="text-[#8B94A8] font-normal text-xs">(optional)</span>
                  </label>
                  <input
                    id="customer-gstin"
                    type="text"
                    maxLength={15}
                    value={customerData.gstin}
                    onChange={(e) => {
                      setIsDirty(true);
                      setCustomerData({ ...customerData, gstin: e.target.value.toUpperCase() });
                      setErrors((prev) => ({ ...prev, gstin: null }));
                    }}
                    placeholder="e.g. 27AAAAA0000A1Z5"
                    className={`w-full h-12 rounded-[10px] bg-[#0F1116] border ${
                      errors.gstin ? 'border-rose-500' : 'border-[#2B3040]'
                    } px-3.5 text-[15px] font-mono uppercase text-[#F2F4F8] placeholder-[#8B94A8] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-[#4F46E5]`}
                  />
                  {errors.gstin ? (
                    <p className="mt-1 text-xs text-[#F87171] flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {errors.gstin}
                    </p>
                  ) : (
                    <p className="text-[11px] text-[#8B94A8] mt-1">Skip for B2C consumer invoices</p>
                  )}
                </div>

                {/* Address */}
                <div>
                  <label
                    htmlFor="customer-address"
                    className="block text-[13px] font-medium text-[#C5CBDA] mb-1.5"
                  >
                    Address <span className="text-[#8B94A8] font-normal text-xs">(optional)</span>
                  </label>
                  <textarea
                    id="customer-address"
                    rows={2}
                    value={customerData.address}
                    onChange={(e) => {
                      setIsDirty(true);
                      setCustomerData({ ...customerData, address: e.target.value });
                    }}
                    placeholder="Street, City, PIN"
                    className="w-full min-h-[48px] rounded-[10px] bg-[#0F1116] border border-[#2B3040] py-3 px-3.5 text-[15px] text-[#F2F4F8] placeholder-[#8B94A8] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-[#4F46E5] resize-y"
                  />
                </div>
              </div>

              {/* Collapsed disclosure for Email or Phone */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowContactDetails(!showContactDetails)}
                  className="text-xs text-[#818CF8] hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                >
                  {showContactDetails ? '– Hide email and phone' : '+ Add email or phone'}
                </button>

                {showContactDetails && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 pt-3 border-t border-[#232733]">
                    <div>
                      <label
                        htmlFor="customer-email"
                        className="block text-[13px] font-medium text-[#C5CBDA] mb-1.5"
                      >
                        Email
                      </label>
                      <input
                        id="customer-email"
                        type="email"
                        value={customerData.email || ''}
                        onChange={(e) => {
                          setIsDirty(true);
                          setCustomerData({ ...customerData, email: e.target.value });
                        }}
                        placeholder="billing@customer.com"
                        className="w-full h-12 rounded-[10px] bg-[#0F1116] border border-[#2B3040] px-3.5 text-[15px] text-[#F2F4F8] placeholder-[#8B94A8] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-[#4F46E5]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="customer-phone"
                        className="block text-[13px] font-medium text-[#C5CBDA] mb-1.5"
                      >
                        Phone
                      </label>
                      <input
                        id="customer-phone"
                        type="tel"
                        value={customerData.phone || ''}
                        onChange={(e) => {
                          setIsDirty(true);
                          setCustomerData({ ...customerData, phone: e.target.value });
                        }}
                        placeholder="+91 98765 43210"
                        className="w-full h-12 rounded-[10px] bg-[#0F1116] border border-[#2B3040] px-3.5 text-[15px] text-[#F2F4F8] placeholder-[#8B94A8] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-[#4F46E5]"
                      />
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* ── 6. SECTION: ITEMS (card with heading "Items") ───────────────── */}
            <section className="bg-[#14161C] border border-[#232733] rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-[#F2F4F8] tracking-tight">Items</h2>
                <button
                  type="button"
                  onClick={() => setShowProductPicker(true)}
                  className="text-xs text-[#818CF8] hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Pick from catalog
                </button>
              </div>

              {errors.items && (
                <div className="bg-rose-500/15 border border-rose-500/30 text-[#F87171] rounded-xl px-4 py-2 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errors.items}</span>
                </div>
              )}

              {/* Items Table container: horizontal scroll on narrow screens */}
              <div className="overflow-x-auto -mx-2 px-2">
                <div className="min-w-[680px] space-y-3">
                  {/* Column Header Row */}
                  <div className="grid grid-cols-[3fr_0.7fr_1.1fr_1fr_1.1fr_36px] gap-3 px-1 text-[13px] font-medium text-[#C5CBDA]">
                    <div>
                      Description <span className="text-rose-400">*</span>
                    </div>
                    <div className="text-right">
                      Qty <span className="text-rose-400">*</span>
                    </div>
                    <div className="text-right">
                      Rate (₹) <span className="text-rose-400">*</span>
                    </div>
                    <div>GST</div>
                    <div className="text-right">Amount (₹)</div>
                    <div></div>
                  </div>

                  {/* Rows */}
                  {items.map((item, idx) => {
                    const rowAmount = (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0);
                    const descError = errors[`item_${idx}_description`];
                    const qtyError = errors[`item_${idx}_quantity`];
                    const rateError = errors[`item_${idx}_rate`];

                    return (
                      <div
                        key={idx}
                        className="grid grid-cols-[3fr_0.7fr_1.1fr_1fr_1.1fr_36px] gap-3 items-start p-2 rounded-xl bg-[#0F1116]/40 border border-[#232733]"
                      >
                        {/* Description + HSN/SAC */}
                        <div>
                          <textarea
                            id={`item_${idx}_description`}
                            ref={(el) => (itemDescriptionRefs.current[idx] = el)}
                            rows={2}
                            placeholder="What are you billing for?"
                            value={item.description || ''}
                            onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                            className={`w-full min-h-[48px] rounded-[10px] bg-[#0F1116] border ${
                              descError ? 'border-rose-500' : 'border-[#2B3040]'
                            } py-2.5 px-3 text-[14px] text-[#F2F4F8] placeholder-[#8B94A8] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-[#4F46E5] resize-y`}
                          />
                          {descError && (
                            <p className="mt-1 text-[11px] text-[#F87171] flex items-center gap-1 font-medium">
                              <AlertCircle className="w-3 h-3 shrink-0" />
                              {descError}
                            </p>
                          )}
                          <input
                            type="text"
                            placeholder="HSN/SAC (optional)"
                            value={item.hsnSac || ''}
                            onChange={(e) => handleItemChange(idx, 'hsnSac', e.target.value)}
                            className="mt-1.5 h-8 w-full rounded-[8px] bg-[#0F1116] border border-[#2B3040] px-2.5 text-xs font-mono text-[#F2F4F8] placeholder-[#8B94A8] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
                          />
                        </div>

                        {/* Qty */}
                        <div>
                          <input
                            id={`item_${idx}_quantity`}
                            type="number"
                            min="0.01"
                            step="any"
                            value={item.quantity ?? 1}
                            onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                            className={`h-12 w-full rounded-[10px] bg-[#0F1116] border ${
                              qtyError ? 'border-rose-500' : 'border-[#2B3040]'
                            } px-2.5 text-[14px] text-right font-medium tabular-nums text-[#F2F4F8] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-[#4F46E5]`}
                          />
                          {qtyError && (
                            <p className="mt-1 text-[11px] text-[#F87171] text-right font-medium">
                              {qtyError}
                            </p>
                          )}
                        </div>

                        {/* Rate */}
                        <div>
                          <input
                            id={`item_${idx}_rate`}
                            type="number"
                            min="0"
                            step="any"
                            value={item.rate ?? 0}
                            onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                            className={`h-12 w-full rounded-[10px] bg-[#0F1116] border ${
                              rateError ? 'border-rose-500' : 'border-[#2B3040]'
                            } px-2.5 text-[14px] text-right font-medium tabular-nums text-[#F2F4F8] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-[#4F46E5]`}
                          />
                          {rateError && (
                            <p className="mt-1 text-[11px] text-[#F87171] text-right font-medium">
                              {rateError}
                            </p>
                          )}
                        </div>

                        {/* GST Rate */}
                        <div>
                          <select
                            value={item.gstRate ?? 18}
                            onChange={(e) => handleItemChange(idx, 'gstRate', Number(e.target.value))}
                            className="h-12 w-full rounded-[10px] bg-[#0F1116] border border-[#2B3040] px-2 text-[14px] font-medium text-[#F2F4F8] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-[#4F46E5] cursor-pointer"
                          >
                            {GST_RATES.map((r) => (
                              <option key={r.value} value={r.value} className="bg-[#14161C] text-[#F2F4F8]">
                                {r.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Amount (read-only, right aligned) */}
                        <div className="h-12 flex items-center justify-end px-2 text-[14px] font-semibold tabular-nums text-[#F2F4F8]">
                          {formatCurrency(rowAmount)}
                        </div>

                        {/* Remove item button */}
                        <div className="h-12 flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            disabled={items.length <= 1}
                            aria-label="Remove item"
                            className="p-2 rounded-lg text-[#8B94A8] hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-20 disabled:pointer-events-none transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dashed "+ Add item" Button */}
              <button
                type="button"
                onClick={handleAddItem}
                className="w-full py-3 border border-dashed border-[#2B3040] hover:border-[#4F46E5] rounded-[10px] bg-[#0F1116]/40 hover:bg-[#0F1116] text-[#818CF8] text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add item</span>
              </button>
            </section>

            {/* ── 7. SECTION: NOTE ────────────────────────────────────────────── */}
            <section className="bg-[#14161C] border border-[#232733] rounded-2xl p-6 space-y-2">
              <label
                htmlFor="invoice-note"
                className="block text-base font-semibold text-[#F2F4F8] tracking-tight"
              >
                Note <span className="text-[#8B94A8] font-normal text-xs">(optional)</span>
              </label>
              <textarea
                id="invoice-note"
                rows={2}
                value={notes}
                onChange={(e) => {
                  setIsDirty(true);
                  setNotes(e.target.value);
                }}
                placeholder="Thank you for your business!"
                className="w-full min-h-[48px] rounded-[10px] bg-[#0F1116] border border-[#2B3040] py-3 px-3.5 text-[15px] text-[#F2F4F8] placeholder-[#8B94A8] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-[#4F46E5] resize-y"
              />
            </section>
          </div>
        )}

        {/* ── 8. VIEW 2: PREVIEW MODE (toggle → Preview) ───────────────────────── */}
        {viewMode === 'preview' && (
          <div className="max-w-[820px] mx-auto space-y-4">
            {/* Top Preview Toolbar with Print and Download */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#14161C] border border-[#232733] rounded-xl no-print">
              <span className="text-xs text-[#8B94A8] font-medium">
                Showing invoice document with real-time tax breakdown
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-[8px] border border-[#2B3040] bg-[#0F1116] hover:bg-[#1F1F23] text-[#F2F4F8] text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="px-3 py-1.5 rounded-[8px] bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>

            {/* Clean White Sheet Invoice Document */}
            <div className="bg-white text-slate-800 rounded-2xl shadow-2xl p-6 sm:p-10 border border-slate-200 font-sans text-xs space-y-6">
              {/* Header Ribbon: Rule 46 Title */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
                      ₹
                    </span>
                    <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider font-heading">
                      TAX INVOICE
                    </h2>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Original for Recipient · Rule 46 of CGST Rules
                  </p>
                </div>

                <div className="text-right">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                    {status || 'Draft'}
                  </span>
                  <div className="text-sm font-mono font-bold text-slate-900 mt-1">
                    {invoiceNumber || 'INV-DRAFT'}
                  </div>
                </div>
              </div>

              {/* Two Column Grid: FROM (Supplier) & BILL TO (Customer) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-[11px]">
                {/* FROM */}
                <div className="space-y-1 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    FROM (Supplier)
                  </span>
                  <div className="font-bold text-slate-900 text-xs">
                    {business?.businessName || 'Your Business Name'}
                  </div>
                  {business?.gstin ? (
                    <div className="font-mono text-slate-700">
                      <span className="text-slate-400">GSTIN: </span>{business.gstin}
                    </div>
                  ) : (
                    <div className="text-amber-600 font-medium text-[10px]">GSTIN not added</div>
                  )}
                  {business?.address && (
                    <div className="text-slate-600 whitespace-pre-line">{business.address}</div>
                  )}
                  {supplierState && (
                    <div className="text-slate-600">
                      <span className="text-slate-400">State: </span>{supplierState}
                    </div>
                  )}
                  {business?.email && <div className="text-slate-500">{business.email}</div>}
                  {business?.phone && <div className="text-slate-500">{business.phone}</div>}
                </div>

                {/* BILL TO */}
                <div className="space-y-1 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    BILL TO (Customer)
                  </span>
                  <div className="font-bold text-slate-900 text-xs">
                    {customerData.name || 'Customer / Client Name'}
                  </div>
                  {customerData.gstin ? (
                    <div className="font-mono text-slate-700">
                      <span className="text-slate-400">GSTIN: </span>{customerData.gstin}
                    </div>
                  ) : (
                    <div className="text-slate-400 text-[10px]">Unregistered / Consumer (B2C)</div>
                  )}
                  {customerData.address && (
                    <div className="text-slate-600 whitespace-pre-line">{customerData.address}</div>
                  )}
                  <div className="text-slate-600">
                    <span className="text-slate-400">Place of supply: </span>
                    <span className="font-semibold text-slate-800">
                      {customerState || 'Not selected'}
                    </span>
                  </div>
                  {customerData.email && <div className="text-slate-500">{customerData.email}</div>}
                  {customerData.phone && <div className="text-slate-500">{customerData.phone}</div>}
                </div>
              </div>

              {/* Invoice Meta Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">Date:</span>
                  <span className="font-semibold text-slate-900">
                    {invoiceDate ? formatDate(invoiceDate) : 'Today'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Due Date:</span>
                  <span className="font-semibold text-slate-900">
                    {dueDate ? formatDate(dueDate) : 'Immediate'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Tax Type:</span>
                  <span className="font-semibold text-indigo-700">
                    {isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-[11px] border-collapse min-w-[560px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase">
                      <th className="py-2.5 px-3 w-8">#</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-2 font-mono">HSN/SAC</th>
                      <th className="py-2.5 px-2 text-right">Qty</th>
                      <th className="py-2.5 px-2 text-right">Rate (₹)</th>
                      <th className="py-2.5 px-2 text-right">GST</th>
                      <th className="py-2.5 px-3 text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((it, idx) => {
                      const qty = parseFloat(it.quantity) || 1;
                      const rate = parseFloat(it.rate) || 0;
                      const calc = calculateItemTotal(it, taxType);

                      return (
                        <tr key={idx} className="align-top">
                          <td className="py-2.5 px-3 text-slate-400 text-center">{idx + 1}</td>
                          <td className="py-2.5 px-3">
                            <div className="font-medium text-slate-900 whitespace-pre-line">
                              {it.description || 'Untitled Item'}
                            </div>
                          </td>
                          <td className="py-2.5 px-2 font-mono text-slate-500">{it.hsnSac || '—'}</td>
                          <td className="py-2.5 px-2 text-right font-medium text-slate-700 tabular-nums">
                            {qty}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-slate-700 tabular-nums">
                            {formatCurrency(rate)}
                          </td>
                          <td className="py-2.5 px-2 text-right font-medium text-slate-700">
                            {it.gstRate || 0}%
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                            {formatCurrency(calc.totalAmount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Tax Breakdown & Grand Total Strip */}
              <div className="flex flex-col sm:flex-row justify-between gap-6 pt-2">
                {/* Notes & Bank Details */}
                <div className="sm:max-w-xs space-y-3 text-[11px] text-slate-600">
                  {bankDetails.accountNumber && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[10px] space-y-0.5">
                      <span className="font-bold text-slate-700 uppercase tracking-wider block">
                        Bank Details
                      </span>
                      <div>
                        <span className="text-slate-400">Bank: </span>
                        {bankDetails.bankName}
                      </div>
                      <div>
                        <span className="text-slate-400">A/C: </span>
                        <span className="font-mono">{bankDetails.accountNumber}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">IFSC: </span>
                        <span className="font-mono">{bankDetails.ifscCode}</span>
                      </div>
                      {bankDetails.upiId && (
                        <div>
                          <span className="text-slate-400">UPI: </span>
                          {bankDetails.upiId}
                        </div>
                      )}
                    </div>
                  )}

                  {notes && (
                    <div>
                      <span className="font-bold text-slate-700 text-[10px] uppercase">Notes:</span>
                      <p className="text-slate-600 mt-0.5 whitespace-pre-line">{notes}</p>
                    </div>
                  )}

                  {terms && (
                    <div>
                      <span className="font-bold text-slate-700 text-[10px] uppercase">Terms:</span>
                      <p className="text-slate-600 mt-0.5 whitespace-pre-line">{terms}</p>
                    </div>
                  )}
                </div>

                {/* Calculation Totals */}
                <div className="w-full sm:max-w-xs space-y-1.5 text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex justify-between">
                    <span>Taxable turnover</span>
                    <span className="font-mono text-slate-900 font-medium tabular-nums">
                      {formatCurrency(invoiceCalculation.taxableAmount || 0)}
                    </span>
                  </div>

                  {!isInterState ? (
                    <>
                      <div className="flex justify-between">
                        <span>CGST</span>
                        <span className="font-mono text-slate-900 tabular-nums">
                          {formatCurrency(invoiceCalculation.cgst || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>SGST</span>
                        <span className="font-mono text-slate-900 tabular-nums">
                          {formatCurrency(invoiceCalculation.sgst || 0)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between">
                      <span>IGST</span>
                      <span className="font-mono text-indigo-700 font-medium tabular-nums">
                        {formatCurrency(invoiceCalculation.igst || 0)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between pt-1 border-t border-slate-200 font-medium">
                    <span>Total GST liability</span>
                    <span className="font-mono text-slate-900 tabular-nums">
                      {formatCurrency(invoiceCalculation.totalTax || 0)}
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline pt-2 border-t border-slate-300">
                    <span className="font-bold text-slate-950 font-heading">Total amount</span>
                    <span className="font-mono text-lg font-bold text-slate-950 tabular-nums">
                      {formatCurrency(invoiceCalculation.netTotal || invoiceCalculation.grandTotal || 0)}
                    </span>
                  </div>

                  <div className="pt-2 text-[10px] text-slate-500 border-t border-slate-200 capitalize">
                    {numberToWords(invoiceCalculation.netTotal || invoiceCalculation.grandTotal || 0)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Product Picker Modal (if chosen to pick from catalog) ──────────────── */}
      <ProductPickerModal
        isOpen={showProductPicker}
        onClose={() => setShowProductPicker(false)}
        onSelectProduct={handleSelectProduct}
        onAddNewProduct={() => {
          setShowProductPicker(false);
          onNavigate('products');
        }}
      />
    </div>
  );
}

export default CreateInvoice;
