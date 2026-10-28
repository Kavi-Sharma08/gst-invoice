import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Users,
  Edit3,
  Trash2,
  Cloud,
  HardDrive,
  Building2,
  Mail,
  Phone,
  MapPin,
  X,
  ShieldCheck
} from 'lucide-react';
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
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-heading">
              Customer Directory
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {customers.length} {customers.length === 1 ? 'client' : 'clients'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Maintain client records, verify GSTINs, and manage billing jurisdictions
          </p>
        </div>

        <Button onClick={handleOpenAdd} size="sm" className="shadow-xs self-start sm:self-auto">
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add Customer
        </Button>
      </div>

      {/* ── Search Bar ──────────────────────────────────────────────────────── */}
      <div className="relative w-full max-w-md">
        <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by customer name, GSTIN, or state..."
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

      {/* ── Customers Table / Cards (Glide Card) ────────────────────────────── */}
      <div className="glide-card overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading customers...</div>
        ) : customers.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 font-heading">
              {search ? 'No matching customers found' : 'Your customer directory is empty'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Add your first customer with their GSTIN and billing address to quickly generate invoices.
            </p>
            <Button onClick={handleOpenAdd} size="sm" className="mt-4 text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Customer
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" aria-label="Customers list">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th scope="col" className="py-3 px-4">Customer Name</th>
                  <th scope="col" className="py-3 px-4">GSTIN</th>
                  <th scope="col" className="py-3 px-4">State</th>
                  <th scope="col" className="py-3 px-4">Contact</th>
                  <th scope="col" className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => {
                  const targetId = c._id || c.id;

                  return (
                    <tr key={targetId} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-xs shrink-0">
                            {(c.name || 'C').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900">{c.name}</span>
                            {c.address && (
                              <p className="text-[11px] text-slate-400 truncate max-w-xs">{c.address}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        {c.gstin ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-900">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            {c.gstin}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Unregistered (B2C)</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-200/70">
                          {c.state || 'Not Specified'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        <div className="space-y-0.5 text-[11px]">
                          {c.email && <div className="text-slate-700 font-medium">{c.email}</div>}
                          {c.phone && <div className="text-slate-400">{c.phone}</div>}
                          {!c.email && !c.phone && <span className="text-slate-400">—</span>}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenEdit(c)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-950 hover:bg-slate-100 transition-colors"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCustomer(c)}
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

      {/* Customer Add/Edit Modal */}
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
