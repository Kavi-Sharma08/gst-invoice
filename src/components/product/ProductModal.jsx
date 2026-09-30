import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { GST_RATES } from '../../gst/taxRules';

export function ProductModal({ isOpen, onClose, onSave, initialData = null }) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'Service',
    hsnSac: '',
    gstRate: 18,
    rate: '',
    unit: 'Nos',
    description: ''
  });

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        type: initialData.type || 'Service',
        hsnSac: initialData.hsnSac || '',
        gstRate: initialData.gstRate ?? 18,
        rate: initialData.rate !== undefined ? initialData.rate : '',
        unit: initialData.unit || 'Nos',
        description: initialData.description || ''
      });
    } else {
      setFormData({
        name: '',
        type: 'Service',
        hsnSac: '',
        gstRate: 18,
        rate: '',
        unit: 'Nos',
        description: ''
      });
    }
    setError('');
  }, [initialData, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Item or service name is required');
      return;
    }

    try {
      setSaving(true);
      await onSave({
        ...formData,
        rate: parseFloat(formData.rate) || 0,
        gstRate: parseFloat(formData.gstRate) || 18
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save item/service');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Product / Service' : 'Add Product or Service'}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="error" title="Validation Error">
            {error}
          </Alert>
        )}

        <Input
          label="Item / Service Name"
          placeholder="e.g. Website Design & Development"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Type"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            options={[
              { value: 'Service', label: 'Service (SAC)' },
              { value: 'Product', label: 'Physical Good (HSN)' }
            ]}
          />

          <Input
            label={formData.type === 'Service' ? 'SAC Code' : 'HSN Code'}
            placeholder="e.g. 998314"
            value={formData.hsnSac}
            onChange={(e) => setFormData({ ...formData, hsnSac: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Select
            label="GST Rate"
            value={formData.gstRate}
            onChange={(e) => setFormData({ ...formData, gstRate: Number(e.target.value) })}
            options={GST_RATES}
          />

          <Input
            label="Default Rate"
            type="number"
            step="any"
            min="0"
            prefix="₹"
            placeholder="0.00"
            value={formData.rate}
            onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
          />

          <Select
            label="Unit"
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            options={['Nos', 'Hours', 'Days', 'Months', 'Sessions', 'Pcs', 'Kg', 'Units', 'Set']}
          />
        </div>

        <div className="w-full">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Default Description (Optional)
          </label>
          <textarea
            rows={2}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Scope of work or item specifications"
            className="w-full text-sm rounded-md border border-slate-300 p-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:border-slate-800 focus:ring-slate-800"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : initialData ? 'Update Item' : 'Save Item'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
