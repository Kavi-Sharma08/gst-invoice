import React, { useState, useEffect } from 'react';
import { Plus, Search, Users, Edit3, Trash2, FilePlus } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { CustomerModal } from '../components/customer/CustomerModal';
import { getCustomers, addCustomer, updateCustomer, deleteCustomer } from '../db/customers';

export function Customers({ onNavigate }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  useEffect(() => {
    loadCustomers();
  }, [search]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const list = await getCustomers(search);
      setCustomers(list);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (customer) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const handleSaveCustomer = async (formData) => {
    if (editingCustomer) {
      await updateCustomer(editingCustomer.id, formData);
    } else {
      await addCustomer(formData);
    }
    loadCustomers();
  };

  const handleDeleteCustomer = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete customer "${name}"?`)) {
      try {
        await deleteCustomer(id);
        loadCustomers();
      } catch (err) {
        alert(err.message || 'Failed to delete customer');
      }
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Customers</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Client directory stored locally on this machine
          </p>
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add Customer
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative w-full max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
        <input
          type="text"
          placeholder="Search customers by name, GSTIN, state..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-slate-300 focus:outline-none focus:border-slate-800"
        />
      </div>

      {/* Customers Table */}
      {customers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-500">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">
            {search ? 'No matching customers found' : 'No customers yet'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            {search
              ? 'Try modifying your search query.'
              : 'Add your first customer to quickly auto-populate invoices.'}
          </p>
          {!search && (
            <Button onClick={handleOpenAdd}>
              <Plus className="w-4 h-4 mr-1.5" />
              Add Customer
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-2.5 px-4">Customer Name</th>
                <th className="py-2.5 px-3">GSTIN</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">State</th>
                <th className="py-2.5 px-3">Contact</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((cust) => (
                <tr key={cust.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    <div>{cust.name}</div>
                    {cust.address && (
                      <div className="text-[11px] font-normal text-slate-500 line-clamp-1">
                        {cust.address}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-700">
                    {cust.gstin || <span className="text-slate-400 font-sans italic">Not registered</span>}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-block text-[11px] px-2 py-0.5 rounded font-medium ${
                        cust.customerType === 'B2B'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {cust.customerType || (cust.gstin ? 'B2B' : 'B2C')}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-700">
                    {cust.state || '—'}
                  </td>
                  <td className="py-3 px-3 text-slate-600">
                    {cust.email && <div>{cust.email}</div>}
                    {cust.phone && <div className="text-[11px] text-slate-400">{cust.phone}</div>}
                    {!cust.email && !cust.phone && <span className="text-slate-400">—</span>}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleOpenEdit(cust)}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 cursor-pointer"
                        title="Edit Customer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCustomer(cust.id, cust.name)}
                        className="p-1.5 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Delete Customer"
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

      {/* Customer Modal */}
      <CustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveCustomer}
        initialData={editingCustomer}
      />
    </div>
  );
}
