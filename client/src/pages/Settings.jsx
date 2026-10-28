import React, { useState, useEffect, useRef } from 'react';
import { Save, Download, Upload, AlertTriangle, ShieldCheck, Check, Database } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Alert } from '../components/ui/Alert';
import { getBusinessProfile, saveBusinessProfile } from '../db/business';
import { getSettings, saveSettings } from '../db/settings';
import { exportBackup, importBackup } from '../db/backup';
import { useAuth } from '../context/AuthContext';
import { businessApi } from '../api/business.api';
import { INDIAN_STATES, getStateByCode } from '../gst/taxRules';
import { validateGSTIN } from '../gst/validateGSTIN';
import { generateNextInvoiceNumber } from '../utils/invoiceNumber';
import { getInvoices } from '../db/invoices';

export function Settings() {
  const { isAuthenticated } = useAuth();
  const fileInputRef = useRef(null);

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

  // Settings
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

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingBiz, setSavingBiz] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [bizMessage, setBizMessage] = useState(null);
  const [settingsMessage, setSettingsMessage] = useState(null);
  const [backupMessage, setBackupMessage] = useState(null);

  useEffect(() => {
    loadAll();
  }, [isAuthenticated]);

  const loadAll = async () => {
    try {
      setLoading(true);
      let biz = null;
      let sets = null;

      if (isAuthenticated) {
        try {
          const res = await businessApi.get();
          if (res?.data) {
            biz = res.data;
            if (biz.invoiceSettings) {
              sets = {
                invoicePrefix: biz.invoiceSettings.invoicePrefix || 'INV/26-27/',
                startingNumber: biz.invoiceSettings.startingNumber || 1,
                defaultNotes: biz.invoiceSettings.defaultNotes || '',
                defaultTerms: biz.invoiceSettings.defaultTerms || '',
                bankDetails: biz.bankDetails || {}
              };
            }
          }
        } catch (apiErr) {
          console.warn('API fetch failed, falling back to local DB:', apiErr);
        }
      }

      const [localBiz, localSets, invList] = await Promise.all([
        getBusinessProfile(),
        getSettings(),
        getInvoices()
      ]);

      if (!biz) biz = localBiz;
      if (!sets) sets = localSets;

      if (biz) {
        setBusiness(biz);
        if (biz.gstin) {
          setGstinFeedback(validateGSTIN(biz.gstin));
        }
      }
      if (sets) {
        setSettings(sets);
      }
      setInvoices(invList || []);
    } catch (err) {
      console.error('Failed to load settings:', err);
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
      setBizMessage({ type: 'error', text: 'Business Name is required' });
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
      if (isAuthenticated) {
        await businessApi.save({
          ...business,
          invoiceSettings: settings,
          bankDetails: settings.bankDetails
        });
      }
      await saveBusinessProfile(business);
      setBizMessage({ type: 'success', text: 'Business profile saved successfully.' });
      setTimeout(() => setBizMessage(null), 4000);
    } catch (err) {
      setBizMessage({ type: 'error', text: err.message || 'Failed to save business profile' });
    } finally {
      setSavingBiz(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSettingsMessage(null);

    try {
      setSavingSettings(true);
      if (isAuthenticated) {
        await businessApi.save({
          ...business,
          invoiceSettings: settings,
          bankDetails: settings.bankDetails
        });
      }
      await saveSettings(settings);
      setSettingsMessage({ type: 'success', text: 'Settings and numbering saved successfully.' });
      setTimeout(() => setSettingsMessage(null), 4000);
    } catch (err) {
      setSettingsMessage({ type: 'error', text: err.message || 'Failed to save settings' });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleExportBackup = async () => {
    setBackupMessage(null);
    try {
      const res = await exportBackup();
      setBackupMessage({
        type: 'success',
        text: `Backup exported successfully (${res.counts.invoices} invoices, ${res.counts.customers} customers). File downloaded.`
      });
    } catch (err) {
      setBackupMessage({ type: 'error', text: err.message || 'Export failed.' });
    }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmed = window.confirm(
      'Importing a backup will replace your current local database with the contents of this file. Do you want to proceed?'
    );
    if (!confirmed) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      setBackupMessage({ type: 'info', text: 'Reading and verifying backup file...' });
      const text = await file.text();
      const parsed = JSON.parse(text);

      const res = await importBackup(parsed, 'replace');
      setBackupMessage({
        type: 'success',
        text: `Database successfully restored! Loaded ${res.importedCounts.invoices} invoices, ${res.importedCounts.customers} customers.`
      });
      loadAll();
    } catch (err) {
      setBackupMessage({
        type: 'error',
        text: `Import failed: ${err.message}`
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const previewNextInvoiceNum = generateNextInvoiceNumber(
    settings.invoicePrefix,
    settings.startingNumber,
    invoices
  );

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-500">Loading settings...</div>;
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16 animate-fade-in">
      {/* Header */}
      <div className="pb-3 border-b border-slate-200/80">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-heading">
          Settings & Configuration
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Configure business profile details, GST invoice series numbering, and local/cloud backups
        </p>
      </div>

      {/* Privacy Notice Pill */}
      <div className="glide-card p-4 flex items-center justify-between text-xs text-slate-700 bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-slate-900">Privacy & Data Security: </span>
            <span className="text-slate-600">
              {isAuthenticated
                ? 'Your business profile and settings are encrypted and securely synchronized with your MongoDB cloud database.'
                : 'All profile data, customers, and invoices remain on this device inside your browser’s IndexedDB storage.'}
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
              label="Business / Trade Name"
              required
              placeholder="e.g. Apex Digital Studios"
              value={business.businessName}
              onChange={(e) => setBusiness({ ...business, businessName: e.target.value })}
            />
            <div>
              <Input
                label="GSTIN"
                placeholder="e.g. 27AAAAA0000A1Z5"
                value={business.gstin}
                onChange={handleGstinChange}
                maxLength={15}
                helperText="15-character Goods & Services Tax Identification Number"
              />
              {gstinFeedback && (
                <p
                  className={`text-xs mt-1 font-medium ${
                    gstinFeedback.isValid ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {gstinFeedback.isValid ? '✓ GSTIN format appears valid' : `Notice: ${gstinFeedback.message}`}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Permanent Account Number (PAN)"
              placeholder="e.g. AAAAA0000A"
              value={business.pan}
              onChange={(e) => setBusiness({ ...business, pan: e.target.value.toUpperCase() })}
              maxLength={10}
            />
            <Select
              label="State / Jurisdiction"
              value={business.state}
              onChange={(e) => setBusiness({ ...business, state: e.target.value })}
              placeholder="Select State"
              options={INDIAN_STATES.map((s) => ({ value: s.name, label: `${s.code} - ${s.name}` }))}
            />
            <Input
              label="Phone"
              placeholder="+91 98765 43210"
              value={business.phone}
              onChange={(e) => setBusiness({ ...business, phone: e.target.value })}
            />
          </div>

          <Input
            label="Email"
            type="email"
            placeholder="contact@business.com"
            value={business.email}
            onChange={(e) => setBusiness({ ...business, email: e.target.value })}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Registered Address
            </label>
            <textarea
              rows={2}
              value={business.address}
              onChange={(e) => setBusiness({ ...business, address: e.target.value })}
              placeholder="Building, street name, city, state, pincode"
              className="w-full text-xs rounded-md border border-slate-300 p-2.5 text-slate-900 focus:outline-none focus:border-slate-800"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={savingBiz}>
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {savingBiz ? 'Saving...' : 'Save Business Profile'}
            </Button>
          </div>
        </form>
      </div>

      {/* 2. Invoice Numbering & Defaults */}
      <div className="glide-card p-6 space-y-5">
        <div className="pb-2 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Invoice Series & Numbering</h2>
          <p className="text-xs text-slate-500">Configure how new invoice numbers are generated sequentially.</p>
        </div>

        {settingsMessage && (
          <Alert variant={settingsMessage.type === 'success' ? 'success' : 'error'}>
            {settingsMessage.text}
          </Alert>
        )}

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
            <Input
              label="Invoice Prefix"
              value={settings.invoicePrefix}
              onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
              placeholder="e.g. INV/26-27/"
              helperText="Common Indian format: INV/YY-YY/"
            />
            <Input
              label="Starting Number"
              type="number"
              min="1"
              value={settings.startingNumber}
              onChange={(e) => setSettings({ ...settings, startingNumber: parseInt(e.target.value, 10) || 1 })}
              helperText="Sequence starting point"
            />
            <div className="pt-5">
              <span className="text-xs text-slate-500 block mb-1">Next Invoice Preview:</span>
              <span className="inline-block px-3 py-1.5 bg-slate-100 border border-slate-200 rounded font-mono font-bold text-slate-900 text-xs">
                {previewNextInvoiceNum}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Default Bank Details (Optional)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <Input
                label="Bank Name"
                value={settings.bankDetails?.bankName || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    bankDetails: { ...settings.bankDetails, bankName: e.target.value }
                  })
                }
                placeholder="e.g. HDFC Bank"
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
                placeholder="e.g. 50200012345678"
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
                placeholder="e.g. HDFC0001234"
              />
              <Input
                label="UPI ID"
                value={settings.bankDetails?.upiId || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    bankDetails: { ...settings.bankDetails, upiId: e.target.value }
                  })
                }
                placeholder="e.g. business@okhdfc"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default Notes
              </label>
              <textarea
                rows={3}
                value={settings.defaultNotes}
                onChange={(e) => setSettings({ ...settings, defaultNotes: e.target.value })}
                placeholder="Thank you for your business!"
                className="w-full text-xs rounded-md border border-slate-300 p-2.5 text-slate-900 focus:outline-none focus:border-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default Payment Terms
              </label>
              <textarea
                rows={3}
                value={settings.defaultTerms}
                onChange={(e) => setSettings({ ...settings, defaultTerms: e.target.value })}
                placeholder="1. Payment due in 15 days..."
                className="w-full text-xs rounded-md border border-slate-300 p-2.5 text-slate-900 focus:outline-none focus:border-slate-800"
              />
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

      {/* 3. Backup & Restore Section */}
      <div className="glide-card p-6 space-y-5">
        <div className="pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-slate-700" />
            <h2 className="text-sm font-semibold text-slate-900">Backup & Restore</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Since BillGST is local-first, keep regular backups of your invoices, customers, and business profiles.
          </p>
        </div>

        {backupMessage && (
          <Alert variant={backupMessage.type === 'success' ? 'success' : backupMessage.type === 'info' ? 'info' : 'error'}>
            {backupMessage.text}
          </Alert>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="p-4 border border-slate-200 rounded-lg bg-slate-50/50 space-y-2">
            <h3 className="text-xs font-bold text-slate-900">Export Backup</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Downloads a timestamped JSON file containing all your local records ({invoices.length} invoices).
            </p>
            <Button variant="outline" size="sm" onClick={handleExportBackup} className="text-xs">
              <Download className="w-3.5 h-3.5 mr-1" />
              Download JSON Backup
            </Button>
          </div>

          <div className="p-4 border border-slate-200 rounded-lg bg-slate-50/50 space-y-2">
            <h3 className="text-xs font-bold text-slate-900">Import Backup</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Restore records from a previously exported BillGST backup file. Validates JSON structure before importing.
            </p>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json,application/json"
              onChange={handleImportFile}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs"
            >
              <Upload className="w-3.5 h-3.5 mr-1" />
              Choose Backup File to Restore
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
