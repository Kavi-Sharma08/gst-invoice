import React, { useState, useEffect } from 'react';
import { Plus, Search, Users, Edit3, Trash2, Cloud, HardDrive } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { CustomerModal } from '../components/customer/CustomerModal';
import { useAuth } from '../context/AuthContext';
import { customersApi } from '../api/customers.api';
import { getCustomers, addCustomer, updateCustomer, deleteCustomer } from '../db/customers';
import { useDebounce } from '../utils/useDebounce';
import { useAppNavigate } from '../utils/navigation';

export function Customers({ onNavigate: propOnNavigate }) {
  const appNavigate = useAppNavigate();
  const onNavigate = propOnNavigate || appNavigate;
  const { isAuthenticated } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  useEffect(() => {
    loadCustomers();
  }, [debouncedSearch, isAuthenticated]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      if (isAuthenticated) {
        try {
          const res = await customersApi.list({ search: debouncedSearch, limit: 100 });
          setCustomers(Array.isArray(res?.data) ? res.data : []);
          return;
        } catch (apiErr) {
          console.warn('API error, falling back to local database:', apiErr);
        }
      }

      const list = await getCustomers(debouncedSearch);
      setCustomers(Array.isArray(list) ? list : []);
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
    try {
      const targetId = editingCustomer?._id || editingCustomer?.id;
      if (isAuthenticated) {
        if (editingCustomer) {
          await customersApi.update(targetId, formData);
        } else {
          await customersApi.create(formData);
        }
      } else {
        if (editingCustomer) {
          await updateCustomer(targetId, formData);
        } else {
          await addCustomer(formData);
        }
      }
      setIsModalOpen(false);
      loadCustomers();
    } catch (err) {
      alert(err.message || 'Failed to save customer');
    }
  };

  const handleDeleteCustomer = async (customer) => {
    const targetId = customer._id || customer.id;
    if (window.confirm(`Are you sure you want to delete customer "${customer.name}"?`)) {
      try {
        if (isAuthenticated && customer._id) {
          await customersApi.delete(targetId);
        } else {
          await deleteCustomer(targetId);
        }
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
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Customers</h1>
            {isAuthenticated ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <Cloud className="w-3 h-3 text-emerald-600" /> Cloud
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                <HardDrive className="w-3 h-3 text-slate-500" /> Local
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAuthenticated
              ? 'Client directory stored securely in MongoDB'
              : 'Client directory stored locally on this machine'}
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
              {customers.map((cust) => {
                const targetId = cust._id || cust.id;
                return (
                  <tr key={targetId} className="hover:bg-slate-50/60 transition-colors">
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
                          onClick={() => handleDeleteCustomer(cust)}
                          className="p-1.5 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                          title="Delete Customer"
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

export default Customers;
