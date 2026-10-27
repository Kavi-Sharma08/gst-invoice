import React, { useRef, useEffect, useCallback } from 'react';
import { Plus, Trash2, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { GST_RATES } from '../../gst/taxRules';
import { formatCurrency } from '../../utils/currency';
import { calculateItemTotal } from '../../gst/calculateGST';

/**
 * Auto-growing textarea that expands as the user types.
 * Resets height to 'auto' on each render cycle so scrollHeight is accurate.
 */
function AutoGrowTextarea({ value, onChange, placeholder }) {
  const ref = useRef(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [value, resize]);

  return (
    <textarea
      ref={ref}
      rows={1}
      placeholder={placeholder}
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
        resize();
      }}
      onInput={resize}
      className="w-full text-xs rounded border border-slate-200 px-2 py-1.5 focus:border-slate-800 focus:outline-none placeholder:text-slate-400 resize-none overflow-hidden leading-relaxed min-h-[32px]"
      style={{ height: 'auto' }}
    />
  );
}

export function InvoiceItemsTable({
  items = [],
  taxType = 'INTRA',
  onChange,
  onOpenProductPicker
}) {
  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    onChange(updated);
  };

  const handleAddItem = () => {
    onChange([
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
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) {
      // Keep at least one empty item row
      onChange([
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
      return;
    }
    const updated = items.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">Items & Services</h3>
        {onOpenProductPicker && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenProductPicker}
            className="text-xs text-slate-700"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-500" />
            Pick from Catalog
          </Button>
        )}
      </div>

      <div className="border border-slate-200 rounded-lg overflow-x-auto bg-white shadow-2xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
              <th className="py-2.5 px-3 w-10 text-center">#</th>
              <th className="py-2.5 px-3 min-w-[200px]">Description</th>
              <th className="py-2.5 px-2 w-24">HSN/SAC</th>
              <th className="py-2.5 px-2 w-20 text-right">Qty</th>
              <th className="py-2.5 px-2 w-28 text-right">Rate (₹)</th>
              <th className="py-2.5 px-2 w-24">GST Rate</th>
              <th className="py-2.5 px-3 w-28 text-right">Taxable</th>
              <th className="py-2.5 px-3 w-32 text-right">
                {taxType === 'INTRA' ? 'Tax (CGST+SGST)' : 'Tax (IGST)'}
              </th>
              <th className="py-2.5 px-3 w-28 text-right">Total (₹)</th>
              <th className="py-2.5 px-2 w-10 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item, index) => {
              const calc = calculateItemTotal(item, taxType);

              return (
                <tr key={index} className="hover:bg-slate-50/50 transition-colors align-top">
                  <td className="py-2.5 px-3 text-center text-slate-400 font-medium">
                    {index + 1}
                  </td>
                  <td className="py-2 px-3">
                    <AutoGrowTextarea
                      placeholder="Item or service description (supports multiple lines)"
                      value={item.description || ''}
                      onChange={(val) => handleItemChange(index, 'description', val)}
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="text"
                      placeholder="SAC/HSN"
                      value={item.hsnSac || ''}
                      onChange={(e) => handleItemChange(index, 'hsnSac', e.target.value)}
                      className="w-full text-xs rounded border border-slate-200 px-2 py-1.5 focus:border-slate-800 focus:outline-none placeholder:text-slate-400"
                    />
                  </td>
                  <td className="py-2 px-2 text-right">
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={item.quantity ?? 1}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      className="w-full text-xs text-right rounded border border-slate-200 px-2 py-1.5 focus:border-slate-800 focus:outline-none"
                    />
                  </td>
                  <td className="py-2 px-2 text-right">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={item.rate ?? 0}
                      onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                      className="w-full text-xs text-right rounded border border-slate-200 px-2 py-1.5 focus:border-slate-800 focus:outline-none font-mono"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <select
                      value={item.gstRate ?? 18}
                      onChange={(e) => handleItemChange(index, 'gstRate', Number(e.target.value))}
                      className="w-full text-xs rounded border border-slate-200 px-1.5 py-1.5 bg-white focus:border-slate-800 focus:outline-none"
                    >
                      {GST_RATES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-700">
                    {formatCurrency(calc.taxableAmount)}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-600 font-mono">
                    <div className="text-[11px] font-medium text-slate-800">
                      {formatCurrency(calc.totalTax)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {taxType === 'INTRA'
                        ? `${calc.cgstRate}% + ${calc.sgstRate}%`
                        : `${calc.igstRate}%`}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">
                    {formatCurrency(calc.totalAmount)}
                  </td>
                  <td className="py-2 px-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddItem}
          className="text-xs"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add Item / Line
        </Button>
      </div>
    </div>
  );
}
