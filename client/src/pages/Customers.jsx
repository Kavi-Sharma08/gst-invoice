/**
 * Customers.jsx — Customer Directory Page
 *
 * Uses theme tokens only (bg, surface, border, text, muted, faint, accent, danger).
 * No light-theme classes (slate-*, white, gray-*).
 */

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Users,
  Edit3,
  Trash2,
  X,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { Button } from '../components/invoice/InvoiceEditorUI';
import { CustomerDrawer } from '../components/customer/CustomerDrawer';
import { useAuth } from '../context/AuthContext';
import { customersApi } from '../api/customers.api';
import { useDebounce } from '../utils/useDebounce';

export function Customers() {
  const { isAuthenticated } = useAuth();
  const [customers,       setCustomers]       = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState(null);
  const [search,          setSearch]          = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [drawerOpen,      setDrawerOpen]      = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  useEffect(() => {
    loadCustomers();
  }, [debouncedSearch, isAuthenticated]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await customersApi.list({ search: debouncedSearch, limit: 100 });
      const list = Array.isArray(res?.data) ? res.data : (res?.data?.customers || []);
      setCustomers(list);
    } catch (err) {
      console.error('Failed to load customers:', err);
      setError(err.message || 'Failed to load customers. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setDrawerOpen(true);
  };

  const handleOpenEdit = (customer) => {
    setEditingCustomer(customer);
    setDrawerOpen(true);
  };

  const handleSaveCustomer = async (formData) => {
    const targetId = editingCustomer?._id || editingCustomer?.id;
    if (editingCustomer) {
      await customersApi.update(targetId, formData);
    } else {
      await customersApi.create(formData);
    }
    setDrawerOpen(false);
    loadCustomers();
  };

  const handleDeleteCustomer = async (customer) => {
    const targetId = customer._id || customer.id;
    if (window.confirm(`Delete customer "${customer.name}"? This cannot be undone.`)) {
      try {
        await customersApi.delete(targetId);
        loadCustomers();
      } catch (err) {
        alert(err.message || 'Failed to delete customer.');
      }
    }
  };

  const isEntirelyEmpty = !loading && customers.length === 0 && !search;

  return (
    <div className="w-full bg-bg text-text font-sans">
      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 py-6 space-y-6 pb-24 lg:pb-12">

        {/* ── Page Header ────────────────────────────────────────────────── */}
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h1 className="text-[20px] font-semibold text-text tracking-tight leading-tight">
                Customers
              </h1>
              <span className="text-xs font-normal text-muted">
                {customers.length} {customers.length === 1 ? 'client' : 'clients'}
              </span>
            </div>
            <p className="text-sm text-muted mt-0.5">
              Maintain client records, verify GSTINs, and manage billing jurisdictions
            </p>
          </div>

          {!isEntirelyEmpty && (
            <Button
              variant="primary"
              size="md"
              aria-label="Add Customer"
              onClick={handleOpenAdd}
              className="shrink-0 h-10 w-10 sm:w-auto p-0 sm:px-4 flex items-center justify-center rounded-lg"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Add Customer</span>
            </Button>
          )}
        </div>

        {/* ── Error Banner ────────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-center justify-between rounded-lg border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm gap-3">
            <div className="flex items-center gap-2 text-danger min-w-0">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="truncate">{error}</span>
            </div>
            <Button variant="secondary" size="sm" onClick={loadCustomers} className="shrink-0">
              Retry
            </Button>
          </div>
        )}

        {/* ── Search ──────────────────────────────────────────────────────── */}
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name or GSTIN…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-8 text-sm font-normal text-text placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-text cursor-pointer p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* ── Table Container ─────────────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          {loading ? (
            /* Skeleton rows */
            <div className="divide-y divide-border">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-[60px] flex items-center px-4 gap-6 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-border shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-border rounded w-36" />
                    <div className="h-2.5 bg-border rounded w-24" />
                  </div>
                  <div className="h-3 bg-border rounded w-32" />
                  <div className="h-3 bg-border rounded w-20" />
                </div>
              ))}
            </div>
          ) : customers.length === 0 ? (
            /* Empty state */
            <div className="min-h-[240px] flex flex-col items-center justify-center p-6 text-center">
              <div className="w-10 h-10 rounded-lg bg-surface border border-border flex items-center justify-center text-muted mb-3">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-text">
                {search ? 'No matching customers' : 'Your customer directory is empty'}
              </h3>
              <p className="text-xs text-muted mt-1 max-w-sm">
                {search
                  ? 'Try adjusting your search term.'
                  : 'Add customers with their GSTIN and billing details to generate invoices faster.'}
              </p>
              {search ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSearch('')}
                  className="mt-4"
                >
                  Clear search
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleOpenAdd}
                  className="mt-4"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Customer
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse" aria-label="Customers list">
                  <thead>
                    <tr className="border-b border-border text-muted font-medium uppercase tracking-wider text-[11px]">
                      <th scope="col" className="py-3 px-4 font-medium">Customer</th>
                      <th scope="col" className="py-3 px-4 font-medium">GSTIN</th>
                      <th scope="col" className="py-3 px-4 font-medium">State</th>
                      <th scope="col" className="py-3 px-4 font-medium">Contact</th>
                      <th scope="col" className="py-3 px-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {customers.map(c => {
                      const targetId = c._id || c.id;
                      return (
                        <tr key={targetId} className="hover:bg-bg transition-colors group">
                          {/* Customer name + avatar + address */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-border text-text flex items-center justify-center font-semibold text-xs shrink-0">
                                {(c.name || 'C').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium text-text text-sm">{c.name}</div>
                                {c.address && (
                                  <div className="text-[11px] text-muted truncate max-w-[200px] mt-0.5">
                                    {c.address}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* GSTIN */}
                          <td className="py-3 px-4">
                            {c.gstin ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-text">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                {c.gstin}
                              </span>
                            ) : (
                              <span className="text-[11px] text-faint">
                                {c.customerType === 'B2C' ? 'Consumer (B2C)' : 'Unregistered'}
                              </span>
                            )}
                          </td>

                          {/* State */}
                          <td className="py-3 px-4">
                            {c.state ? (
                              <span className="text-xs font-medium text-muted px-2 py-0.5 rounded-md bg-border border border-border">
                                {c.state}
                              </span>
                            ) : (
                              <span className="text-faint text-xs">—</span>
                            )}
                          </td>

                          {/* Contact */}
                          <td className="py-3 px-4 text-muted">
                            <div className="space-y-0.5 text-[11px]">
                              {c.email && <div className="text-text">{c.email}</div>}
                              {c.phone && <div className="text-muted">+91 {c.phone}</div>}
                              {!c.email && !c.phone && <span className="text-faint">—</span>}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleOpenEdit(c)}
                                className="p-1.5 rounded-lg text-muted hover:text-text hover:bg-border transition-colors cursor-pointer"
                                aria-label={`Edit ${c.name}`}
                                title="Edit"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteCustomer(c)}
                                className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                                aria-label={`Delete ${c.name}`}
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

              {/* Mobile stacked cards */}
              <div className="md:hidden divide-y divide-border">
                {customers.map(c => {
                  const targetId = c._id || c.id;
                  return (
                    <div key={targetId} className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-border text-text flex items-center justify-center font-semibold text-xs shrink-0">
                            {(c.name || 'C').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-text text-sm truncate">{c.name}</div>
                            {c.state && (
                              <div className="text-[11px] text-muted">{c.state}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleOpenEdit(c)}
                            className="p-1.5 rounded-lg text-muted hover:text-text hover:bg-border transition-colors cursor-pointer"
                            aria-label={`Edit ${c.name}`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCustomer(c)}
                            className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                            aria-label={`Delete ${c.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {c.gstin && (
                        <div className="flex items-center gap-1 text-[11px] text-text">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" />
                          {c.gstin}
                        </div>
                      )}
                      {(c.email || c.phone) && (
                        <div className="text-[11px] text-muted">
                          {c.email && <span>{c.email}</span>}
                          {c.email && c.phone && ' · '}
                          {c.phone && <span>+91 {c.phone}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

      </div>

      {/* ── Customer Drawer ────────────────────────────────────────────────── */}
      <CustomerDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSave={handleSaveCustomer}
        initialData={editingCustomer}
      />
    </div>
  );
}

export default Customers;
