import React, { useState, useEffect } from 'react';
import { Search, Plus, Check } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { productsApi } from '../../api/products.api';
import { formatCurrency } from '../../utils/currency';

export function ProductPickerModal({ isOpen, onClose, onSelectProduct, onAddNewProduct }) {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadProducts(search);
    }
  }, [isOpen, search]);

  const loadProducts = async (q) => {
    try {
      setLoading(true);
      const res = await productsApi.list({ search: q, limit: 50 });
      const list = Array.isArray(res?.data) ? res.data : (res?.data?.products || []);
      setProducts(list);
    } catch (err) {
      console.error('Failed to load products for picker:', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select Item / Service" maxWidth="max-w-lg">
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search products or services..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-full border border-slate-200/90 bg-white placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-3 focus:ring-slate-900/5 shadow-2xs"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-xs shrink-0"
            onClick={() => {
              onClose();
              if (onAddNewProduct) onAddNewProduct();
            }}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            New Item
          </Button>
        </div>

        <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 border border-slate-200/90 rounded-xl bg-white shadow-2xs">
          {products.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              {loading ? 'Searching catalog...' : 'No items found in catalog.'}
            </div>
          ) : (
            products.map((p) => (
              <div
                key={p.id || p._id}
                onClick={() => {
                  onSelectProduct(p);
                  onClose();
                }}
                className="p-3.5 hover:bg-slate-50/80 cursor-pointer flex items-center justify-between transition-colors group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900 group-hover:text-slate-950">
                      {p.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium">
                      {p.type || 'Product'}
                    </span>
                    {p.hsnSac && (
                      <span className="text-[10px] font-mono text-slate-400">
                        {p.type === 'Service' ? 'SAC' : 'HSN'}: {p.hsnSac}
                      </span>
                    )}
                  </div>
                  {p.description && (
                    <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{p.description}</p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-slate-900 tabular-nums">
                    {formatCurrency(p.unitPrice ?? p.rate ?? 0)}
                  </div>
                  <div className="text-[10px] font-semibold text-emerald-600">{p.gstRate ?? 18}% GST</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
