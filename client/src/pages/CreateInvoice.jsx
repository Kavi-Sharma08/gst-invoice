import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Save,
  Eye,
  Plus,
  UserPlus,
  Sparkles,
  Check,
  AlertCircle,
  Building2,
  Calendar,
  Layers,
  Columns,
  Layout
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { Alert } from '../components/ui/Alert';

import { InvoiceItemsTable } from '../components/invoice/InvoiceItemsTable';
import { InvoiceSummary } from '../components/invoice/InvoiceSummary';
import { InvoicePreviewModal } from '../components/invoice/InvoicePreviewModal';
import { CustomerModal } from '../components/customer/CustomerModal';
import { ProductPickerModal } from '../components/invoice/ProductPickerModal';
import { ProductModal } from '../components/product/ProductModal';
import { LiveInvoiceSheet } from '../components/invoice/LiveInvoiceSheet';

import { getBusinessProfile } from '../db/business';
import { getCustomers, addCustomer } from '../db/customers';
import { addProduct } from '../db/products';
import { getInvoices, getInvoiceById, saveInvoice, updateInvoice } from '../db/invoices';
import { getSettings } from '../db/settings';

import { useAuth } from '../context/AuthContext';
import { invoicesApi } from '../api/invoices.api';
import { businessApi } from '../api/business.api';
import { customersApi } from '../api/customers.api';

import { determineTaxType, calculateInvoiceTotal } from '../gst/calculateGST';
import { validateInvoice } from '../gst/validateInvoice';
import { generateNextInvoiceNumber, isDuplicateInvoiceNumber } from '../utils/invoiceNumber';
import { getTodayInputDate } from '../utils/date';
import { INDIAN_STATES } from '../gst/taxRules';
import { useParams } from 'react-router-dom';
import { useAppNavigate } from '../utils/navigation';

export function CreateInvoice({ invoiceId: propInvoiceId, onNavigate: propOnNavigate }) {
  const params = useParams();
  const appNavigate = useAppNavigate();
  const onNavigate = propOnNavigate || appNavigate;
  const invoiceId = propInvoiceId || params.id;
  const isEditing = Boolean(invoiceId);
  const { isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessages, setErrorMessages] = useState([]);
  const [viewMode, setViewMode] = useState('split'); // 'split' | 'editor'

  // Business & Customers & Settings loaded from DB
  const [business, setBusiness] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [existingInvoices, setExistingInvoices] = useState([]);
  const [settings, setSettings] = useState(null);

  // Form State
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(getTodayInputDate());
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState('Issued');
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

  // Modals state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showCreateProductModal, setShowCreateProductModal] = useState(false);

  // Load initial setup
  useEffect(() => {
    loadSetupData();
  }, [invoiceId, isAuthenticated]);

  const loadSetupData = async () => {
    try {
      setLoading(true);
      let biz = null;
      let custList = [];
      let invList = [];
      let sets = null;

      if (isAuthenticated) {
        try {
          const [bRes, cRes, iRes] = await Promise.all([
            businessApi.get(),
            customersApi.list({ limit: 100 }),
            invoicesApi.list({ limit: 100 })
          ]);
          biz = bRes?.data || null;
          custList = Array.isArray(cRes?.data) ? cRes.data : [];
          invList = Array.isArray(iRes?.data) ? iRes.data : [];
          if (biz?.invoiceSettings) {
            sets = {
              invoicePrefix: biz.invoiceSettings.invoicePrefix || 'INV/',
              startingNumber: biz.invoiceSettings.startingNumber || 1,
              defaultNotes: biz.invoiceSettings.defaultNotes || '',
              defaultTerms: biz.invoiceSettings.defaultTerms || '',
              bankDetails: biz.bankDetails || {}
            };
          }
        } catch (apiErr) {
          console.warn('API fetch failed, falling back to local DB:', apiErr);
        }
      }

      if (!biz || !sets) {
        const [localBiz, localCusts, localInvs, localSets] = await Promise.all([
          getBusinessProfile(),
          getCustomers(),
          getInvoices(),
          getSettings()
        ]);
        if (!biz) biz = localBiz;
        if (!custList.length) custList = Array.isArray(localCusts) ? localCusts : [];
        if (!invList.length) invList = Array.isArray(localInvs) ? localInvs : [];
        if (!sets) sets = localSets;
      }

      setBusiness(biz);
      setCustomers(Array.isArray(custList) ? custList : []);
      setExistingInvoices(Array.isArray(invList) ? invList : []);
      setSettings(sets || {});

      if (isEditing) {
        let inv = null;
        if (isAuthenticated) {
          try {
            const res = await invoicesApi.get(invoiceId);
            inv = res?.data || null;
          } catch {
            // fallback
          }
        }
        if (!inv) {
          inv = await getInvoiceById(invoiceId);
        }

        if (inv) {
          setInvoiceNumber(inv.invoiceNumber || '');
          setInvoiceDate(inv.invoiceDate || getTodayInputDate());
          setDueDate(inv.dueDate || '');
          setStatus(inv.status || 'Issued');
          setSelectedCustomerId(inv.customerId ? String(inv.customerId) : '');
          setCustomerData(inv.customer || {});
          setPlaceOfSupply(inv.placeOfSupply || inv.customer?.state || '');
          setItems(inv.items?.length ? inv.items : []);
          setNotes(inv.notes || '');
          setTerms(inv.terms || '');
          setBankDetails(inv.bankDetails || sets?.bankDetails || {});
        }
      } else {
        // Generate new invoice number
        const nextNum = generateNextInvoiceNumber(
          sets?.invoicePrefix || 'INV/',
          sets?.startingNumber || 1,
          invList
        );
        setInvoiceNumber(nextNum);
        setNotes(sets?.defaultNotes || '');
        setTerms(sets?.defaultTerms || '');
        if (sets?.bankDetails) {
          setBankDetails(sets.bankDetails);
        }
      }
    } catch (err) {
      console.error('Failed to initialize invoice editor:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCustomer = (e) => {
    const custId = e.target.value;
    setSelectedCustomerId(custId);
    const found = customers.find((c) => String(c._id || c.id) === String(custId));
    if (found) {
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
    } else {
      setCustomerData({
        name: '',
        gstin: '',
        address: '',
        state: '',
        phone: '',
        email: ''
      });
    }
  };

  // Determine current tax type
  const effectivePlaceOfSupply = placeOfSupply || customerData.state || business?.state || '';
  const taxType = determineTaxType(business?.state, effectivePlaceOfSupply);

  // Compute live calculations
  const invoiceCalculation = calculateInvoiceTotal(items, taxType);

  // Assemble full draft invoice object
  const buildInvoicePayload = () => {
    return {
      invoiceNumber: invoiceNumber.trim(),
      invoiceDate,
      dueDate,
      status,
      customerId: selectedCustomerId ? (isNaN(selectedCustomerId) ? selectedCustomerId : Number(selectedCustomerId)) : null,
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

  const handleSave = async (targetStatus = status) => {
    setErrorMessages([]);
    const payload = buildInvoicePayload();
    payload.status = targetStatus;

    // Validate
    const validation = validateInvoice(payload);
    if (!validation.isValid) {
      setErrorMessages(validation.errors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Check duplicate invoice number if creating new or modified
    if (isDuplicateInvoiceNumber(payload.invoiceNumber, invoiceId, existingInvoices)) {
      setErrorMessages([`Invoice Number "${payload.invoiceNumber}" already exists. Please choose a unique number.`]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      setSaving(true);
      if (isAuthenticated) {
        if (isEditing) {
          await invoicesApi.update(invoiceId, payload);
          onNavigate('invoice-details', invoiceId);
        } else {
          const res = await invoicesApi.create(payload);
          const targetId = res?.data?._id || res?.data?.id;
          onNavigate('invoice-details', targetId);
        }
      } else {
        if (isEditing) {
          await updateInvoice(invoiceId, payload);
          onNavigate('invoice-details', invoiceId);
        } else {
          const saved = await saveInvoice(payload);
          onNavigate('invoice-details', saved.id);
        }
      }
    } catch (err) {
      setErrorMessages([err.message || 'Failed to save invoice']);
    } finally {
      setSaving(false);
    }
  };

  const handleAddNewCustomerSaved = async (newCustomer) => {
    try {
      let added = null;
      if (isAuthenticated) {
        const res = await customersApi.create(newCustomer);
        added = res?.data;
        const cRes = await customersApi.list({ limit: 100 });
        setCustomers(Array.isArray(cRes?.data) ? cRes.data : (added ? [added] : []));
      } else {
        added = await addCustomer(newCustomer);
        const custList = await getCustomers();
        setCustomers(Array.isArray(custList) ? custList : []);
      }

      const custId = added?._id || added?.id;
      setSelectedCustomerId(String(custId));
      setCustomerData({
        name: added.name || '',
        gstin: added.gstin || '',
        address: added.address || '',
        state: added.state || '',
        phone: added.phone || '',
        email: added.email || ''
      });
      if (added.state) {
        setPlaceOfSupply(added.state);
      }
      setShowAddCustomerModal(false);
    } catch (err) {
      alert(err.message || 'Failed to add customer');
    }
  };

  const handleSelectProduct = (prod) => {
    // Append or replace the last empty item
    const newItem = {
      description: prod.name ? `${prod.name}${prod.description ? `\n${prod.description}` : ''}` : '',
      hsnSac: prod.hsnSac || '',
      quantity: 1,
      unit: prod.unit || 'Nos',
      rate: prod.unitPrice || 0,
      discount: 0,
      gstRate: prod.gstRate ?? 18
    };

    if (items.length === 1 && !items[0].description && !items[0].rate) {
      setItems([newItem]);
    } else {
      setItems([...items, newItem]);
    }
  };

  const handleSaveNewProduct = async (productData) => {
    try {
      await addProduct(productData);
      handleSelectProduct(productData);
      setShowCreateProductModal(false);
    } catch (err) {
      alert(err.message || 'Failed to save product');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center py-16">
        <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-slate-900 animate-spin" />
        <p className="mt-3 text-xs text-slate-500 font-medium">Preparing invoice editor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* ── Top Bar with Glide Header & Action Pills ────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="p-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-950 transition-colors cursor-pointer shadow-2xs"
            title="Return to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 font-heading">
                {isEditing ? `Edit Invoice (${invoiceNumber})` : 'New GST Tax Invoice'}
              </h1>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700'
              }`}>
                {status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Fill line items with multiline scope, review live GST calculations, and export instantly
            </p>
          </div>
        </div>

        {/* View Mode Toggle & Primary Actions */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* Segmented View Mode Pill */}
          <div className="hidden lg:inline-flex p-0.5 bg-slate-100 rounded-full border border-slate-200/70 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('editor')}
              className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'editor'
                  ? 'bg-white text-slate-950 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layout className="w-3.5 h-3.5" />
              <span>Editor</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'split'
                  ? 'bg-white text-slate-950 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Live Split Sheet</span>
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreviewModal(true)}
            className="text-xs"
          >
            <Eye className="w-3.5 h-3.5 mr-1" />
            Full Preview
          </Button>

          <Button
            size="sm"
            onClick={() => handleSave('Issued')}
            disabled={saving}
            className="text-xs shadow-xs"
          >
            <Save className="w-3.5 h-3.5 mr-1" />
            {saving ? 'Saving...' : 'Save & Issue'}
          </Button>
        </div>
      </div>

      {/* Errors Alert */}
      {errorMessages.length > 0 && (
        <Alert variant="error" title="Please review the following requirements:">
          <ul className="list-disc pl-4 space-y-0.5 mt-1">
            {errorMessages.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Warning if Business Profile is empty */}
      {(!business || !business.businessName) && (
        <Alert variant="warning" title="Business profile is not configured">
          Your business name and GSTIN are empty. Head to{' '}
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className="underline font-semibold hover:text-slate-900 cursor-pointer"
          >
            Settings
          </button>{' '}
          to add your business details so they appear on invoices.
        </Alert>
      )}

      {/* ── Main Layout (Editor or Split Live Sheet) ────────────────────────── */}
      <div className={`grid grid-cols-1 ${viewMode === 'split' ? 'lg:grid-cols-12 gap-8' : 'gap-6'}`}>
        {/* Left Column: Form Editor */}
        <div className={`space-y-6 ${viewMode === 'split' ? 'lg:col-span-7' : 'w-full'}`}>
          {/* Section 1: Invoice Meta Details */}
          <div className="glide-card p-5 sm:p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight font-heading pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>Invoice Specifications</span>
              <span className="text-[11px] font-medium text-slate-400">Step 1 of 3</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <Input
                label="Invoice Number"
                required
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="INV/26-27/001"
                helperText="Sequential invoice identifier"
              />
              <Input
                label="Invoice Date"
                type="date"
                required
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
              <Input
                label="Payment Due Date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                helperText="Optional payment deadline"
              />
              <Select
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={[
                  { value: 'Draft', label: 'Draft (Working Copy)' },
                  { value: 'Issued', label: 'Issued (Ready for payment)' },
                  { value: 'Paid', label: 'Paid (Settled)' },
                  { value: 'Cancelled', label: 'Cancelled' }
                ]}
              />
            </div>
          </div>

          {/* Section 2: Customer & Tax Jurisdiction */}
          <div className="glide-card p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight font-heading">
                Customer & GST Place of Supply
              </h2>
              <Button
                variant="outline"
                size="xs"
                onClick={() => setShowAddCustomerModal(true)}
                className="text-[11px]"
              >
                <UserPlus className="w-3 h-3 mr-1" />
                New Customer
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Select Existing Customer"
                value={selectedCustomerId}
                onChange={handleSelectCustomer}
                placeholder="-- Choose from directory --"
                options={customers.map((c) => ({
                  value: String(c._id || c.id),
                  label: `${c.name} ${c.gstin ? `(${c.gstin})` : ''}`
                }))}
              />

              <Select
                label="Place of Supply (State)"
                value={placeOfSupply}
                onChange={(e) => setPlaceOfSupply(e.target.value)}
                placeholder="Select State for GST Rule"
                options={INDIAN_STATES.map((s) => ({
                  value: s.name,
                  label: `${s.code} - ${s.name}`
                }))}
                helperText={`Determines GST Rule: ${
                  taxType === 'INTRA' ? 'Intra-State (CGST + SGST)' : 'Inter-State (IGST)'
                }`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <Input
                label="Customer / Business Name"
                required
                placeholder="e.g. Acme Innovations Pvt Ltd"
                value={customerData.name}
                onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
              />
              <Input
                label="GSTIN (Optional for B2C)"
                placeholder="e.g. 27AAAAA0000A1Z5"
                value={customerData.gstin}
                onChange={(e) => setCustomerData({ ...customerData, gstin: e.target.value.toUpperCase() })}
                maxLength={15}
              />
              <Input
                label="Customer Email"
                type="email"
                placeholder="accounts@acme.in"
                value={customerData.email}
                onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
              />
            </div>

            <div className="pt-1">
              <Input
                label="Billing Address"
                placeholder="Street address, city, state, postal code"
                value={customerData.address}
                onChange={(e) => setCustomerData({ ...customerData, address: e.target.value })}
              />
            </div>
          </div>

          {/* Section 3: Line Items with Large Multiline Description */}
          <div className="glide-card p-5 sm:p-6 space-y-4">
            <InvoiceItemsTable
              items={items}
              taxType={taxType}
              onChange={setItems}
              onOpenProductPicker={() => setShowProductPicker(true)}
            />
          </div>

          {/* Section 4: Notes, Terms, and Bank Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glide-card p-5 space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-heading">
                Notes & Terms of Service
              </h3>
              <Textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Thank you for your business. Payment is due within 15 days."
              />
            </div>

            <div className="glide-card p-5 space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-heading">
                Bank & UPI Settlement Details
              </h3>
              <div className="grid grid-cols-2 gap-2.5">
                <Input
                  placeholder="Bank Name"
                  value={bankDetails.bankName || ''}
                  onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                />
                <Input
                  placeholder="Account Number"
                  value={bankDetails.accountNumber || ''}
                  onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                />
                <Input
                  placeholder="IFSC Code"
                  value={bankDetails.ifscCode || ''}
                  onChange={(e) => setBankDetails({ ...bankDetails, ifscCode: e.target.value.toUpperCase() })}
                />
                <Input
                  placeholder="UPI ID (e.g. pay@hdfc)"
                  value={bankDetails.upiId || ''}
                  onChange={(e) => setBankDetails({ ...bankDetails, upiId: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Summary Box (in single column view) */}
          {viewMode !== 'split' && (
            <div className="glide-card p-5">
              <InvoiceSummary summary={invoiceCalculation} />
            </div>
          )}
        </div>

        {/* Right Column: Live Invoice Preview Sheet (in Split Mode) */}
        {viewMode === 'split' && (
          <div className="hidden lg:block lg:col-span-5 space-y-4">
            <div className="sticky top-20 space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span className="font-semibold text-slate-900 flex items-center gap-1.5 font-heading">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  Live Invoice Preview
                </span>
                <span className="text-[11px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium border border-emerald-200/70">
                  Real-time Sync
                </span>
              </div>

              {/* Photorealistic Live Sheet */}
              <LiveInvoiceSheet
                business={business}
                customer={customerData}
                invoiceNumber={invoiceNumber}
                invoiceDate={invoiceDate}
                dueDate={dueDate}
                status={status}
                placeOfSupply={effectivePlaceOfSupply}
                taxType={taxType}
                items={items}
                calculation={invoiceCalculation}
                notes={notes}
                terms={terms}
                bankDetails={bankDetails}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Fixed Bottom Actions Bar ────────────────────────────────────────── */}
      <div className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/80 p-4 rounded-2xl shadow-lg flex items-center justify-between">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onNavigate('dashboard')}
        >
          Cancel
        </Button>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSave('Draft')}
            disabled={saving}
          >
            Save as Draft
          </Button>

          <Button
            size="sm"
            onClick={() => handleSave('Issued')}
            disabled={saving}
            className="shadow-xs"
          >
            <Save className="w-3.5 h-3.5 mr-1" />
            {saving ? 'Saving...' : 'Save & Issue Invoice'}
          </Button>
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      <InvoicePreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        invoice={buildInvoicePayload()}
      />

      <CustomerModal
        isOpen={showAddCustomerModal}
        onClose={() => setShowAddCustomerModal(false)}
        onSave={handleAddNewCustomerSaved}
      />

      <ProductPickerModal
        isOpen={showProductPicker}
        onClose={() => setShowProductPicker(false)}
        onSelectProduct={handleSelectProduct}
        onAddNewProduct={() => setShowCreateProductModal(true)}
      />

      <ProductModal
        isOpen={showCreateProductModal}
        onClose={() => setShowCreateProductModal(false)}
        onSave={handleSaveNewProduct}
      />
    </div>
  );
}

export default CreateInvoice;
