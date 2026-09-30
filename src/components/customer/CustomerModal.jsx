import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { INDIAN_STATES, getStateByCode } from '../../gst/taxRules';
import { validateGSTIN } from '../../gst/validateGSTIN';

export function CustomerModal({ isOpen, onClose, onSave, initialData = null }) {
  const [formData, setFormData] = useState({
    name: '',
    gstin: '',
    customerType: 'B2B',
    address: '',
    state: '',
    email: '',
    phone: ''
  });

  const [gstinFeedback, setGstinFeedback] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        gstin: initialData.gstin || '',
        customerType: initialData.customerType || (initialData.gstin ? 'B2B' : 'B2C'),
        address: initialData.address || '',
        state: initialData.state || '',
        email: initialData.email || '',
        phone: initialData.phone || ''
      });
      if (initialData.gstin) {
        setGstinFeedback(validateGSTIN(initialData.gstin));
      } else {
        setGstinFeedback(null);
      }
    } else {
      setFormData({
        name: '',
        gstin: '',
        customerType: 'B2B',
        address: '',
        state: '',
        email: '',
        phone: ''
      });
      setGstinFeedback(null);
    }
    setError('');
  }, [initialData, isOpen]);

  const handleGstinChange = (e) => {
    const val = e.target.value.toUpperCase();
    setFormData((prev) => ({ ...prev, gstin: val }));

    if (val.trim()) {
      const result = validateGSTIN(val);
      setGstinFeedback(result);
      // Auto-set state if state code matches and state is not yet set
      if (result.isValid && result.stateCode) {
        const matchedState = getStateByCode(result.stateCode);
        if (matchedState) {
          setFormData((prev) => ({ ...prev, state: matchedState.name, customerType: 'B2B' }));
        }
      }
    } else {
      setGstinFeedback(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Customer / Client name is required');
      return;
    }

    if (formData.gstin && formData.gstin.trim()) {
      const gstinVal = validateGSTIN(formData.gstin);
      if (!gstinVal.isValid) {
        setError(gstinVal.message);
        return;
      }
    }

    try {
      setSaving(true);
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Customer' : 'Add New Customer'}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="error" title="Validation Error">
            {error}
          </Alert>
        )}

        <Input
          label="Customer / Client Name"
          placeholder="e.g. Acme Innovations Pvt Ltd"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Customer Type"
            value={formData.customerType}
            onChange={(e) => setFormData({ ...formData, customerType: e.target.value })}
            options={[
              { value: 'B2B', label: 'Registered Business (B2B)' },
              { value: 'B2C', label: 'Unregistered / Consumer (B2C)' }
            ]}
          />

          <Select
            label="State / Place of Supply"
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            placeholder="Select State"
            options={INDIAN_STATES.map((s) => ({ value: s.name, label: `${s.code} - ${s.name}` }))}
          />
        </div>

        <div>
          <Input
            label="GSTIN (Optional for B2C)"
            placeholder="e.g. 27ABCDE1234F1Z5"
            value={formData.gstin}
            onChange={handleGstinChange}
            maxLength={15}
            helperText="15-character Goods and Services Tax Identification Number"
          />
          {gstinFeedback && (
            <p
              className={`text-xs mt-1.5 flex items-center gap-1 ${
                gstinFeedback.isValid ? 'text-emerald-700 font-medium' : 'text-amber-700'
              }`}
            >
              {gstinFeedback.isValid ? '✓ GSTIN format appears valid' : `Notice: ${gstinFeedback.message}`}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Email"
            type="email"
            placeholder="billing@acme.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />

          <Input
            label="Phone"
            type="tel"
            placeholder="+91 98765 43210"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>

        <div className="w-full">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Billing Address
          </label>
          <textarea
            rows={2}
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Complete street address, City, PIN code"
            className="w-full text-sm rounded-md border border-slate-300 p-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:border-slate-800 focus:ring-slate-800"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : initialData ? 'Update Customer' : 'Save Customer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
