import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Eye, Plus, Sparkles, UserPlus } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Alert } from '../components/ui/Alert';
import { InvoiceItemsTable } from '../components/invoice/InvoiceItemsTable';
import { InvoiceSummary } from '../components/invoice/InvoiceSummary';
import { InvoicePreviewModal } from '../components/invoice/InvoicePreviewModal';
import { CustomerModal } from '../components/customer/CustomerModal';
import { ProductPickerModal } from '../components/invoice/ProductPickerModal';
import { ProductModal } from '../components/product/ProductModal';

import { getBusinessProfile } from '../db/business';
import { getCustomers, addCustomer } from '../db/customers';
import { addProduct } from '../db/products';
import { getInvoices, getInvoiceById, saveInvoice, updateInvoice } from '../db/invoices';
import { getSettings } from '../db/settings';

import { determineTaxType, calculateInvoiceTotal } from '../gst/calculateGST';
import { validateInvoice } from '../gst/validateInvoice';
import { generateNextInvoiceNumber, isDuplicateInvoiceNumber } from '../utils/invoiceNumber';
import { getTodayInputDate } from '../utils/date';
import { INDIAN_STATES } from '../gst/taxRules';

export function CreateInvoice({ invoiceId, onNavigate }) {
  const isEditing = Boolean(invoiceId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessages, setErrorMessages] = useState([]);

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
  }, [invoiceId]);

  const loadSetupData = async () => {
    try {
      setLoading(true);
      const [biz, custList, invList, sets] = await Promise.all([
        getBusinessProfile(),
        getCustomers(),
        getInvoices(),
        getSettings()
      ]);

      setBusiness(biz);
      setCustomers(custList);
      setExistingInvoices(invList);
      setSettings(sets);

      if (isEditing) {
        const inv = await getInvoiceById(invoiceId);
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
          setBankDetails(inv.bankDetails || sets.bankDetails || {});
        }
      } else {
        // Generate new invoice number
        const nextNum = generateNextInvoiceNumber(
          sets.invoicePrefix,
          sets.startingNumber,
          invList
        );
        setInvoiceNumber(nextNum);
        setNotes(sets.defaultNotes || '');
        setTerms(sets.defaultTerms || '');
        setBankDetails(sets.bankDetails || {});
      }
    } catch (err) {
      console.error('Failed to load setup:', err);
      setErrorMessages(['Failed to load storage data: ' + err.message]);
    } finally {
      setLoading(false);
    }
  };

  // Handle customer selection
  const handleSelectCustomer = (e) => {
    const custId = e.target.value;
    setSelectedCustomerId(custId);

    if (custId) {
      const found = customers.find((c) => String(c.id) === String(custId));
      if (found) {
        setCustomerData({
          id: found.id,
          name: found.name || '',
          gstin: found.gstin || '',
          address: found.address || '',
          state: found.state || '',
          phone: found.phone || '',
          email: found.email || ''
        });
        setPlaceOfSupply(found.state || '');
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
      customerId: selectedCustomerId ? Number(selectedCustomerId) : null,
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
    const payload = { ...buildInvoicePayload(), status: targetStatus };

    // Validate
    const valResult = validateInvoice(payload);
    if (!valResult.isValid) {
      setErrorMessages(valResult.errors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Check for duplicate invoice number
    if (isDuplicateInvoiceNumber(payload.invoiceNumber, isEditing ? Number(invoiceId) : null, existingInvoices)) {
      setErrorMessages([`Invoice number "${payload.invoiceNumber}" is already in use by another invoice.`]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      setSaving(true);
      if (isEditing) {
        await updateInvoice(invoiceId, payload);
        onNavigate('invoice-details', invoiceId);
      } else {
        const saved = await saveInvoice(payload);
        onNavigate('invoice-details', saved.id);
      }
    } catch (err) {
      setErrorMessages([err.message || 'Failed to save invoice']);
    } finally {
      setSaving(false);
    }
  };

  const handleAddNewCustomerSaved = async (newCustomer) => {
    try {
      const added = await addCustomer(newCustomer);
      const custList = await getCustomers();
      setCustomers(custList);
      setSelectedCustomerId(String(added.id));
      setCustomerData({
        id: added.id,
        name: added.name,
        gstin: added.gstin,
        address: added.address,
        state: added.state,
        phone: added.phone,
        email: added.email
      });
      setPlaceOfSupply(added.state || '');
    } catch (err) {
      alert(err.message || 'Failed to add customer');
    }
  };

  const handleSelectProduct = (product) => {
    const newItem = {
      description: product.name + (product.description ? ` - ${product.description}` : ''),
      hsnSac: product.hsnSac || '',
      quantity: 1,
      unit: product.unit || 'Nos',
      rate: product.rate || 0,
      discount: 0,
      gstRate: product.gstRate ?? 18
    };

    // If first item is empty, replace it, otherwise append
    if (
      items.length === 1 &&
      !items[0].description.trim() &&
      (!items[0].rate || items[0].rate === 0)
    ) {
      setItems([newItem]);
    } else {
      setItems([...items, newItem]);
    }
  };

  const handleSaveNewProduct = async (productData) => {
    await addProduct(productData);
    handleSelectProduct(productData);
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-500">Loading invoice workspace...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('dashboard')}
            className="text-xs text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {isEditing ? `Edit Invoice (${invoiceNumber})` : 'Create Invoice'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Fill details, review live GST calculations, and export instantly
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreviewModal(true)}
          >
            <Eye className="w-3.5 h-3.5 mr-1" />
            Preview
          </Button>
          <Button
            size="sm"
            onClick={() => handleSave('Issued')}
            disabled={saving}
          >
            <Save className="w-3.5 h-3.5 mr-1" />
            {saving ? 'Saving...' : 'Save & Issue'}
          </Button>
        </div>
      </div>

      {/* Errors */}
      {errorMessages.length > 0 && (
        <Alert variant="error" title="Please review the following requirements:">
          <ul className="list-disc pl-4 space-y-0.5 mt-1">
            {errorMessages.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Notification if Business Profile is empty */}
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

      {/* Section 1: Invoice Details & Meta */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 pb-2 border-b border-slate-100">
          Invoice Details
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
            label="Due Date (Optional)"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: 'Issued', label: 'Issued' },
              { value: 'Paid', label: 'Paid' },
              { value: 'Draft', label: 'Draft' }
            ]}
          />
        </div>
      </div>

      {/* Section 2: Customer / Recipient */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Customer Details</h2>
            <p className="text-[11px] text-slate-500">Select an existing client or enter manual details</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddCustomerModal(true)}
            className="text-xs"
          >
            <UserPlus className="w-3.5 h-3.5 mr-1" />
            + Add Customer
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Select Saved Customer"
            value={selectedCustomerId}
            onChange={handleSelectCustomer}
            placeholder="-- Choose from directory --"
            options={customers.map((c) => ({
              value: String(c.id),
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
            helperText={`Determines GST Type: ${
              taxType === 'INTRA' ? 'Intra-State (CGST + SGST)' : 'Inter-State (IGST)'
            }`}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
          <Input
            label="Customer Name"
            required
            placeholder="e.g. Acme Innovations"
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
            placeholder="client@example.com"
            value={customerData.email}
            onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
          />
        </div>

        <div className="pt-1">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Customer Billing Address
          </label>
          <input
            type="text"
            placeholder="Street address, city, state, pincode"
            value={customerData.address}
            onChange={(e) => setCustomerData({ ...customerData, address: e.target.value })}
            className="w-full text-xs rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:border-slate-800"
          />
        </div>
      </div>

      {/* Section 3: Line Items */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-4">
        <InvoiceItemsTable
          items={items}
          taxType={taxType}
          onChange={setItems}
          onOpenProductPicker={() => setShowProductPicker(true)}
        />
      </div>

      {/* Section 4: Summary & Payment Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Notes, Terms & Bank Details */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 pb-2 border-b border-slate-100">
            Notes & Bank Details
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notes & Terms
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment instructions or thanks message..."
              className="w-full text-xs rounded-md border border-slate-300 p-2.5 text-slate-900 focus:outline-none focus:border-slate-800"
            />
          </div>

          <div className="pt-2 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-800 block mb-2">
              Bank Details (Printed on Invoice)
            </span>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <input
                type="text"
                placeholder="Bank Name"
                value={bankDetails.bankName || ''}
                onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                className="rounded border border-slate-300 px-2 py-1.5 focus:border-slate-800"
              />
              <input
                type="text"
                placeholder="Account Number"
                value={bankDetails.accountNumber || ''}
                onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                className="rounded border border-slate-300 px-2 py-1.5 focus:border-slate-800"
              />
              <input
                type="text"
                placeholder="IFSC Code"
                value={bankDetails.ifscCode || ''}
                onChange={(e) => setBankDetails({ ...bankDetails, ifscCode: e.target.value.toUpperCase() })}
                className="rounded border border-slate-300 px-2 py-1.5 focus:border-slate-800 uppercase"
              />
              <input
                type="text"
                placeholder="UPI ID (e.g. name@okhdfc)"
                value={bankDetails.upiId || ''}
                onChange={(e) => setBankDetails({ ...bankDetails, upiId: e.target.value })}
                className="rounded border border-slate-300 px-2 py-1.5 focus:border-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Live Calculation Summary */}
        <InvoiceSummary summary={invoiceCalculation} />
      </div>

      {/* Bottom Action Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <Button variant="secondary" onClick={() => onNavigate('dashboard')}>
          Cancel
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowPreviewModal(true)}>
            <Eye className="w-3.5 h-3.5 mr-1" />
            Preview Invoice
          </Button>
          <Button onClick={() => handleSave('Issued')} disabled={saving}>
            <Save className="w-3.5 h-3.5 mr-1" />
            {saving ? 'Saving...' : 'Save & Issue'}
          </Button>
        </div>
      </div>

      {/* Preview Modal */}
      <InvoicePreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        invoice={buildInvoicePayload()}
      />

      {/* Add Customer Modal */}
      <CustomerModal
        isOpen={showAddCustomerModal}
        onClose={() => setShowAddCustomerModal(false)}
        onSave={handleAddNewCustomerSaved}
      />

      {/* Product Picker Modal */}
      <ProductPickerModal
        isOpen={showProductPicker}
        onClose={() => setShowProductPicker(false)}
        onSelectProduct={handleSelectProduct}
        onAddNewProduct={() => setShowCreateProductModal(true)}
      />

      {/* Create Product Modal from inside picker */}
      <ProductModal
        isOpen={showCreateProductModal}
        onClose={() => setShowCreateProductModal(false)}
        onSave={handleSaveNewProduct}
      />
    </div>
  );
}
