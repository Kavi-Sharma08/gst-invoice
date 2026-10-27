import React, { useState, useEffect } from 'react';
import { Search, Plus, Check } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { getProducts } from '../../db/products';
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
      const list = await getProducts(q);
      setProducts(list);
    } catch (err) {
      console.error(err);
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
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search products or services..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-slate-300 focus:outline-none focus:border-slate-800"
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

        <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-md">
          {products.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              {loading ? 'Loading items...' : 'No items found. Create your first item or service.'}
            </div>
          ) : (
            products.map((p) => (
              <div
                key={p.id}
                onClick={() => {
                  onSelectProduct(p);
                  onClose();
                }}
                className="p-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-slate-900 group-hover:text-blue-600">
                      {p.name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                      {p.type}
                    </span>
                    {p.hsnSac && (
                      <span className="text-[10px] font-mono text-slate-400">
                        {p.type === 'Service' ? 'SAC' : 'HSN'}: {p.hsnSac}
                      </span>
                    )}
                  </div>
                  {p.description && (
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{p.description}</p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono font-medium text-slate-800">
                    {formatCurrency(p.rate)}
                  </div>
                  <div className="text-[10px] text-slate-400">{p.gstRate}% GST</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
