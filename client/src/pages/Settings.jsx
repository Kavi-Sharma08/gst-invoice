import React, { useState, useEffect } from 'react';
import { Save, ShieldCheck } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Alert } from '../components/ui/Alert';
import { useAuth } from '../context/AuthContext';
import { businessApi } from '../api/business.api';
import { INDIAN_STATES, getStateByCode } from '../gst/taxRules';
import { validateGSTIN } from '../gst/validateGSTIN';

export function Settings() {
  const { isAuthenticated } = useAuth();

  // Business Profile
  const [business, setBusiness] = useState({
    businessName: '',
    gstin: '',
    pan: '',
    address: '',
    state: '',
    email: '',
    phone: ''
  });
  const [gstinFeedback, setGstinFeedback] = useState(null);

  // Invoice & Bank Settings
  const [settings, setSettings] = useState({
    invoicePrefix: 'INV/26-27/',
    startingNumber: 1,
    defaultNotes: '',
    defaultTerms: '',
    bankDetails: {
      accountName: '',
      accountNumber: '',
      bankName: '',
      ifscCode: '',
      branch: '',
      upiId: ''
    }
  });

  const [loading, setLoading] = useState(true);
  const [savingBiz, setSavingBiz] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [bizMessage, setBizMessage] = useState(null);
  const [settingsMessage, setSettingsMessage] = useState(null);

  useEffect(() => {
    loadAll();
  }, [isAuthenticated]);

  const loadAll = async () => {
    try {
      setLoading(true);
      const res = await businessApi.get();
      const biz = res?.data || null;

      if (biz) {
        setBusiness({
          businessName: biz.businessName || '',
          gstin: biz.gstin || '',
          pan: biz.pan || '',
          address: biz.address || '',
          state: biz.state || '',
          email: biz.email || '',
          phone: biz.phone || ''
        });

        if (biz.gstin) {
          setGstinFeedback(validateGSTIN(biz.gstin));
        }

        if (biz.invoiceSettings || biz.bankDetails) {
          setSettings({
            invoicePrefix: biz.invoiceSettings?.invoicePrefix || 'INV/26-27/',
            startingNumber: biz.invoiceSettings?.startingNumber || 1,
            defaultNotes: biz.invoiceSettings?.defaultNotes || '',
            defaultTerms: biz.invoiceSettings?.defaultTerms || '',
            bankDetails: biz.bankDetails || {
              accountName: '',
              accountNumber: '',
              bankName: '',
              ifscCode: '',
              branch: '',
              upiId: ''
            }
          });
        }
      }
    } catch (err) {
      console.error('Failed to load settings from API:', err);
      setBizMessage({ type: 'error', text: 'Failed to load business settings. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleGstinChange = (e) => {
    const val = e.target.value.toUpperCase();
    setBusiness((prev) => ({ ...prev, gstin: val }));

    if (val.trim()) {
      const res = validateGSTIN(val);
      setGstinFeedback(res);
      if (res.isValid && res.stateCode) {
        const s = getStateByCode(res.stateCode);
        if (s) {
          setBusiness((prev) => ({ ...prev, state: s.name, pan: res.pan || prev.pan }));
        }
      }
    } else {
      setGstinFeedback(null);
    }
  };

  const handleSaveBusiness = async (e) => {
    e.preventDefault();
    setBizMessage(null);

    if (!business.businessName.trim()) {
      setBizMessage({ type: 'error', text: 'Business Name is required.' });
      return;
    }

    if (business.gstin && business.gstin.trim()) {
      const val = validateGSTIN(business.gstin);
      if (!val.isValid) {
        setBizMessage({ type: 'error', text: val.message });
        return;
      }
    }

    try {
      setSavingBiz(true);
      await businessApi.save({
        ...business,
        invoiceSettings: {
          invoicePrefix: settings.invoicePrefix,
          startingNumber: settings.startingNumber,
          defaultNotes: settings.defaultNotes,
          defaultTerms: settings.defaultTerms
        },
        bankDetails: settings.bankDetails
      });
      setBizMessage({ type: 'success', text: 'Changes saved successfully.' });
      setTimeout(() => setBizMessage(null), 4000);
    } catch (err) {
      setBizMessage({ type: 'error', text: err.message || 'Unable to save changes. Please try again.' });
    } finally {
      setSavingBiz(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSettingsMessage(null);

    try {
      setSavingSettings(true);
      await businessApi.save({
        ...business,
        invoiceSettings: {
          invoicePrefix: settings.invoicePrefix,
          startingNumber: settings.startingNumber,
          defaultNotes: settings.defaultNotes,
          defaultTerms: settings.defaultTerms
        },
        bankDetails: settings.bankDetails
      });
      setSettingsMessage({ type: 'success', text: 'Invoice and bank settings saved successfully.' });
      setTimeout(() => setSettingsMessage(null), 4000);
    } catch (err) {
      setSettingsMessage({ type: 'error', text: err.message || 'Unable to save settings. Please try again.' });
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-slate-500">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16 animate-fade-in">
      {/* Header */}
      <div className="pb-3 border-b border-slate-200/80">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-heading">
          Settings & Configuration
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Configure business profile details, GST invoice series numbering, and payment instructions
        </p>
      </div>

      {/* Security & Cloud Notice Pill */}
      <div className="glide-card p-4 flex items-center justify-between text-xs text-slate-700 bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-slate-900">Cloud Storage: </span>
            <span className="text-slate-600">
              Your business profile, invoice sequences, and bank details are securely saved to your MongoDB account.
            </span>
          </div>
        </div>
      </div>

      {/* 1. Business Profile Section */}
      <div className="glide-card p-6 space-y-5">
        <div className="pb-3 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900 font-heading">Business Profile (Supplier)</h2>
          <p className="text-xs text-slate-500 mt-0.5">This information appears at the top of all issued GST tax invoices.</p>
        </div>

        {bizMessage && (
          <Alert variant={bizMessage.type === 'success' ? 'success' : 'error'}>
            {bizMessage.text}
          </Alert>
        )}

        <form onSubmit={handleSaveBusiness} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Legal Business / Trade Name *"
              value={business.businessName}
              onChange={(e) => setBusiness({ ...business, businessName: e.target.value })}
              placeholder="e.g. Sharma Traders"
              required
            />

            <div>
              <Input
                label="GSTIN (15 characters)"
                value={business.gstin}
                onChange={handleGstinChange}
                placeholder="07AABCS1234F1Z5"
                maxLength={15}
              />
              {gstinFeedback && (
                <p className={`text-[11px] mt-1 ${gstinFeedback.isValid ? 'text-emerald-700 font-medium' : 'text-amber-700'}`}>
                  {gstinFeedback.message}
                </p>
              )}
            </div>

            <Input
              label="PAN Number"
              value={business.pan}
              onChange={(e) => setBusiness({ ...business, pan: e.target.value.toUpperCase() })}
              placeholder="AABCS1234F"
              maxLength={10}
            />

            <Select
              label="State / Union Territory"
              value={business.state}
              onChange={(e) => setBusiness({ ...business, state: e.target.value })}
              options={[
                { value: '', label: 'Select your registered state...' },
                ...INDIAN_STATES.map((s) => ({ value: s.name, label: `${s.code} - ${s.name}` }))
              ]}
            />

            <Input
              label="Contact Email"
              type="email"
              value={business.email}
              onChange={(e) => setBusiness({ ...business, email: e.target.value })}
              placeholder="billing@sharmatraders.in"
            />

            <Input
              label="Contact Phone"
              value={business.phone}
              onChange={(e) => setBusiness({ ...business, phone: e.target.value })}
              placeholder="+91 98765 43210"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Full Business Address</label>
            <textarea
              rows={3}
              value={business.address}
              onChange={(e) => setBusiness({ ...business, address: e.target.value })}
              placeholder="Shop No. 12, Main Market, Dwarka Sector 6, New Delhi - 110075"
              className="w-full text-xs rounded-md border border-slate-300 p-2.5 text-slate-900 focus:outline-none focus:border-slate-800"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={savingBiz}>
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {savingBiz ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>
        </form>
      </div>

      {/* 2. Invoice Settings & Bank Details */}
      <div className="glide-card p-6 space-y-5">
        <div className="pb-3 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900 font-heading">Invoice Series & Payment Details</h2>
          <p className="text-xs text-slate-500 mt-0.5">Preset prefix, starting series, and default bank/UPI details.</p>
        </div>

        {settingsMessage && (
          <Alert variant={settingsMessage.type === 'success' ? 'success' : 'error'}>
            {settingsMessage.text}
          </Alert>
        )}

        <form onSubmit={handleSaveSettings} className="space-y-5">
          {/* Invoice Numbering Config */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Invoice Numbering Series</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Invoice Prefix"
                value={settings.invoicePrefix}
                onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
                placeholder="e.g. INV/26-27/"
              />
              <Input
                label="Starting Sequence Number"
                type="number"
                min={1}
                value={settings.startingNumber}
                onChange={(e) => setSettings({ ...settings, startingNumber: parseInt(e.target.value, 10) || 1 })}
              />
            </div>
          </div>

          {/* Bank Details */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Bank & UPI Settlement Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Bank Account Name"
                value={settings.bankDetails?.accountName || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    bankDetails: { ...settings.bankDetails, accountName: e.target.value }
                  })
                }
                placeholder="Sharma Traders Current A/c"
              />

              <Input
                label="Account Number"
                value={settings.bankDetails?.accountNumber || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    bankDetails: { ...settings.bankDetails, accountNumber: e.target.value }
                  })
                }
                placeholder="123456789012"
              />

              <Input
                label="Bank Name"
                value={settings.bankDetails?.bankName || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    bankDetails: { ...settings.bankDetails, bankName: e.target.value }
                  })
                }
                placeholder="HDFC Bank"
              />

              <Input
                label="IFSC Code"
                value={settings.bankDetails?.ifscCode || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    bankDetails: { ...settings.bankDetails, ifscCode: e.target.value.toUpperCase() }
                  })
                }
                placeholder="HDFC0001234"
              />

              <Input
                label="Branch"
                value={settings.bankDetails?.branch || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    bankDetails: { ...settings.bankDetails, branch: e.target.value }
                  })
                }
                placeholder="Dwarka Sector 6"
              />

              <Input
                label="UPI ID / VPA (Optional)"
                value={settings.bankDetails?.upiId || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    bankDetails: { ...settings.bankDetails, upiId: e.target.value }
                  })
                }
                placeholder="sharma@upi"
              />
            </div>
          </div>

          {/* Notes and Terms */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Default Disclaimers & Notes</h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Default Customer Notes</label>
                <textarea
                  rows={2}
                  value={settings.defaultNotes}
                  onChange={(e) => setSettings({ ...settings, defaultNotes: e.target.value })}
                  placeholder="Thank you for your business!"
                  className="w-full text-xs rounded-md border border-slate-300 p-2.5 text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Default Terms & Conditions</label>
                <textarea
                  rows={3}
                  value={settings.defaultTerms}
                  onChange={(e) => setSettings({ ...settings, defaultTerms: e.target.value })}
                  placeholder="1. Payment due within 15 days..."
                  className="w-full text-xs rounded-md border border-slate-300 p-2.5 text-slate-900 focus:outline-none focus:border-slate-800"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={savingSettings}>
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {savingSettings ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Settings;
