import React, { useRef, useEffect, useCallback } from 'react';
import { Plus, Trash2, Sparkles, HelpCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { GST_RATES } from '../../gst/taxRules';
import { formatCurrency } from '../../utils/currency';
import { calculateItemTotal } from '../../gst/calculateGST';

/**
 * Auto-growing multiline textarea that expands cleanly with content.
 */
function MultilineDescriptionField({ value, onChange, placeholder }) {
  const ref = useRef(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(48, el.scrollHeight)}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [value, resize]);

  return (
    <textarea
      ref={ref}
      rows={2}
      placeholder={placeholder}
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
        resize();
      }}
      onInput={resize}
      className="w-full text-xs rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-slate-900 transition-all placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-3 focus:ring-slate-900/5 resize-y leading-relaxed min-h-[48px]"
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight font-heading">
            Line Items & Services
          </h3>
          <p className="text-[11px] text-slate-500">
            Specify products, multiline service descriptions, HSN/SAC codes, and GST tax brackets
          </p>
        </div>

        {onOpenProductPicker && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenProductPicker}
            className="text-xs text-slate-700 self-start sm:self-auto shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 mr-1" />
            Pick from Product Catalog
          </Button>
        )}
      </div>

      {/* Line Items Table — Glide Style */}
      <div className="border border-slate-200/90 rounded-2xl overflow-x-auto bg-white shadow-2xs">
        <table className="w-full text-left text-xs border-collapse min-w-[760px]">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold text-[11px]">
              <th className="py-3 px-3 w-10 text-center">#</th>
              <th className="py-3 px-3 min-w-[260px]">Item Description & Scope</th>
              <th className="py-3 px-2 w-24">HSN / SAC</th>
              <th className="py-3 px-2 w-20 text-right">Qty</th>
              <th className="py-3 px-2 w-28 text-right">Rate (₹)</th>
              <th className="py-3 px-2 w-24">GST Rate</th>
              <th className="py-3 px-3 w-28 text-right">Taxable</th>
              <th className="py-3 px-3 w-32 text-right">
                {taxType === 'INTRA' ? 'Tax (CGST+SGST)' : 'Tax (IGST)'}
              </th>
              <th className="py-3 px-3 w-28 text-right">Total (₹)</th>
              <th className="py-3 px-2 w-10 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item, index) => {
              const calc = calculateItemTotal(item, taxType);

              return (
                <tr key={index} className="hover:bg-slate-50/60 transition-colors align-top">
                  <td className="py-3 px-3 text-center text-slate-400 font-bold text-xs pt-4">
                    {index + 1}
                  </td>
                  <td className="py-2.5 px-3">
                    <MultilineDescriptionField
                      placeholder="e.g. Full-stack Web Development & GST Integration for Q2. Includes API architecture, MongoDB setup, and deployment."
                      value={item.description || ''}
                      onChange={(val) => handleItemChange(index, 'description', val)}
                    />
                  </td>
                  <td className="py-2.5 px-2">
                    <input
                      type="text"
                      placeholder="e.g. 998314"
                      value={item.hsnSac || ''}
                      onChange={(e) => handleItemChange(index, 'hsnSac', e.target.value)}
                      className="w-full text-xs rounded-xl border border-slate-200/90 px-2.5 py-2 text-slate-900 transition-all focus:border-slate-900 focus:ring-2 focus:ring-slate-900/5 focus:outline-none placeholder:text-slate-400 font-mono"
                    />
                  </td>
                  <td className="py-2.5 px-2 text-right">
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={item.quantity ?? 1}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      className="w-full text-xs text-right rounded-xl border border-slate-200/90 px-2 py-2 text-slate-900 transition-all focus:border-slate-900 focus:ring-2 focus:ring-slate-900/5 focus:outline-none tabular-nums font-medium"
                    />
                  </td>
                  <td className="py-2.5 px-2 text-right">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={item.rate ?? 0}
                      onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                      className="w-full text-xs text-right rounded-xl border border-slate-200/90 px-2 py-2 text-slate-900 transition-all focus:border-slate-900 focus:ring-2 focus:ring-slate-900/5 focus:outline-none tabular-nums font-mono font-medium"
                    />
                  </td>
                  <td className="py-2.5 px-2">
                    <select
                      value={item.gstRate ?? 18}
                      onChange={(e) => handleItemChange(index, 'gstRate', Number(e.target.value))}
                      className="w-full text-xs rounded-xl border border-slate-200/90 px-2 py-2 bg-white text-slate-900 transition-all focus:border-slate-900 focus:ring-2 focus:ring-slate-900/5 focus:outline-none font-medium cursor-pointer"
                    >
                      {GST_RATES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-700 tabular-nums font-medium pt-3.5">
                    {formatCurrency(calc.taxableAmount)}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums pt-3">
                    <div className="text-xs font-bold text-slate-900">
                      {formatCurrency(calc.totalTax)}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">
                      {taxType === 'INTRA'
                        ? `${calc.cgstRate}% + ${calc.sgstRate}%`
                        : `${calc.igstRate}%`}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-950 tabular-nums pt-3.5">
                    {formatCurrency(calc.totalAmount)}
                  </td>
                  <td className="py-3 px-2 text-center pt-3">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
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
          Add Line Item
        </Button>
      </div>
    </div>
  );
}

export default InvoiceItemsTable;
