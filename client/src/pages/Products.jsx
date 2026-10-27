import React, { useState, useEffect } from 'react';
import { Plus, Search, Package, Edit3, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { ProductModal } from '../components/product/ProductModal';
import { getProducts, addProduct, updateProduct, deleteProduct } from '../db/products';
import { formatCurrency } from '../utils/currency';

export function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    loadProducts();
  }, [search]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const list = await getProducts(search);
      setProducts(list);
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
    if (editingProduct) {
      await updateProduct(editingProduct.id, formData);
    } else {
      await addProduct(formData);
    }
    loadProducts();
  };

  const handleDeleteProduct = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await deleteProduct(id);
        loadProducts();
      } catch (err) {
        alert(err.message || 'Failed to delete product');
      }
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Products & Services</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pre-configure frequent offerings, SAC/HSN codes, and tax rates
          </p>
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add Item / Service
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative w-full max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
        <input
          type="text"
          placeholder="Search items by name, HSN/SAC, description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-slate-300 focus:outline-none focus:border-slate-800"
        />
      </div>

      {/* Products Table */}
      {products.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-500">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">
            {search ? 'No matching items found' : 'No items or services yet'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            {search
              ? 'Try modifying your search query.'
              : 'Save your common services or products here to add them to invoices in one click.'}
          </p>
          {!search && (
            <Button onClick={handleOpenAdd}>
              <Plus className="w-4 h-4 mr-1.5" />
              Add First Item
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-2.5 px-4">Item / Service Name</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">HSN/SAC</th>
                <th className="py-2.5 px-3">GST Rate</th>
                <th className="py-2.5 px-3 text-right">Default Rate</th>
                <th className="py-2.5 px-3">Unit</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((prod) => (
                <tr key={prod.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    <div>{prod.name}</div>
                    {prod.description && (
                      <div className="text-[11px] font-normal text-slate-500 line-clamp-1">
                        {prod.description}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-block text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                      {prod.type}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-700">
                    {prod.hsnSac || '—'}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-700">
                    {prod.gstRate}%
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-medium text-slate-900">
                    {formatCurrency(prod.rate)}
                  </td>
                  <td className="py-3 px-3 text-slate-600">
                    {prod.unit || 'Nos'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleOpenEdit(prod)}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 cursor-pointer"
                        title="Edit Item"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(prod.id, prod.name)}
                        className="p-1.5 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Delete Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
