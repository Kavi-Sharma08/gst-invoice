import React, { useState, useEffect } from 'react';
import { Plus, Search, Package, Edit3, Trash2, Cloud, HardDrive, Tag, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { ProductModal } from '../components/product/ProductModal';
import { useAuth } from '../context/AuthContext';
import { productsApi } from '../api/products.api';
import { getProducts, addProduct, updateProduct, deleteProduct } from '../db/products';
import { formatCurrency } from '../utils/currency';
import { useDebounce } from '../utils/useDebounce';

export function Products() {
  const { isAuthenticated } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    loadProducts();
  }, [debouncedSearch, isAuthenticated]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      if (isAuthenticated) {
        try {
          const res = await productsApi.list({ search: debouncedSearch, limit: 100 });
          setProducts(Array.isArray(res?.data) ? res.data : []);
          return;
        } catch (apiErr) {
          console.warn('API error, falling back to local database:', apiErr);
        }
      }

      const list = await getProducts(debouncedSearch);
      setProducts(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (formData) => {
    try {
      const targetId = editingProduct?._id || editingProduct?.id;
      if (isAuthenticated) {
        if (editingProduct) {
          await productsApi.update(targetId, formData);
        } else {
          await productsApi.create(formData);
        }
      } else {
        if (editingProduct) {
          await updateProduct(targetId, formData);
        } else {
          await addProduct(formData);
        }
      }
      setIsModalOpen(false);
      loadProducts();
    } catch (err) {
      alert(err.message || 'Failed to save product');
    }
  };

  const handleDeleteProduct = async (product) => {
    const targetId = product._id || product.id;
    if (window.confirm(`Are you sure you want to delete "${product.name}"?`)) {
      try {
        if (isAuthenticated && product._id) {
          await productsApi.delete(targetId);
        } else {
          await deleteProduct(targetId);
        }
        loadProducts();
      } catch (err) {
        alert(err.message || 'Failed to delete product');
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-heading">
              Products & Services
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {products.length} {products.length === 1 ? 'offering' : 'offerings'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Standardize catalog items, preset HSN/SAC codes, and configure default tax brackets
          </p>
        </div>

        <Button onClick={handleOpenAdd} size="sm" className="shadow-xs self-start sm:self-auto">
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add Item / Service
        </Button>
      </div>

      {/* ── Search Bar ──────────────────────────────────────────────────────── */}
      <div className="relative w-full max-w-md">
        <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search items by name, HSN/SAC, description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-xs rounded-full border border-slate-200/90 bg-white pl-9 pr-8 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-3 focus:ring-slate-900/5 shadow-2xs"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ── Products Table / Cards (Glide Card) ────────────────────────────── */}
      <div className="glide-card overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading catalog...</div>
        ) : products.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 font-heading">
              {search ? 'No matching items found' : 'Your product catalog is empty'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Save your frequent consulting services or physical goods to populate invoices in a single click.
            </p>
            <Button onClick={handleOpenAdd} size="sm" className="mt-4 text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add First Item
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" aria-label="Products list">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th scope="col" className="py-3 px-4">Item & Description</th>
                  <th scope="col" className="py-3 px-4">HSN / SAC</th>
                  <th scope="col" className="py-3 px-4 text-right">Unit Price</th>
                  <th scope="col" className="py-3 px-4">GST Rate</th>
                  <th scope="col" className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => {
                  const targetId = p._id || p.id;

                  return (
                    <tr key={targetId} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div>
                          <span className="font-bold text-slate-900">{p.name}</span>
                          {p.description && (
                            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{p.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {p.hsnSac ? (
                          <span className="bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded text-[11px]">
                            {p.hsnSac}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-950 tabular-nums">
                        {formatCurrency(p.unitPrice || 0)}
                        <span className="text-[10px] text-slate-400 font-normal ml-1">/ {p.unit || 'Nos'}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/70 px-2.5 py-0.5 rounded-full">
                          {p.gstRate ?? 18}% GST
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-950 hover:bg-slate-100 transition-colors"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Product Modal */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveProduct}
        initialData={editingProduct}
      />
    </div>
  );
}

export default Products;
