import React, { useState } from 'react';
import {
  FileText,
  Users,
  Package,
  Settings as SettingsIcon,
  LayoutDashboard,
  Plus,
  ShieldCheck,
  Menu,
  X
} from 'lucide-react';
import { Dashboard } from './pages/Dashboard';
import { Invoices } from './pages/Invoices';
import { CreateInvoice } from './pages/CreateInvoice';
import { InvoiceDetails } from './pages/InvoiceDetails';
import { Customers } from './pages/Customers';
import { Products } from './pages/Products';
import { Settings } from './pages/Settings';
import { Button } from './components/ui/Button';

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [activeId, setActiveId] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigate = (page, id = null) => {
    setCurrentPage(page);
    setActiveId(id);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'products', label: 'Products & Services', icon: Package },
    { id: 'settings', label: 'Settings', icon: SettingsIcon }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFC] text-[#1E2024]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-slate-200 no-print">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <div className="flex items-center gap-6">
              <button
                onClick={() => navigate('dashboard')}
                className="flex items-center gap-2 font-bold text-base tracking-tight text-slate-900 cursor-pointer"
              >
                <div className="w-7 h-7 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                  ₹
                </div>
                <span>BillGST</span>
              </button>

              {/* Desktop Nav Items */}
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    currentPage === item.id ||
                    (item.id === 'invoices' &&
                      (currentPage === 'invoice-details' ||
                        currentPage === 'create-invoice' ||
                        currentPage === 'edit-invoice'));

                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-slate-100 text-slate-900'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Right side info & primary action */}
            <div className="hidden sm:flex items-center gap-3">
              <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium bg-slate-50 border border-slate-200 px-2 py-1 rounded">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>100% Local-First</span>
              </div>

              {currentPage !== 'create-invoice' && (
                <Button size="sm" onClick={() => navigate('create-invoice')} className="text-xs">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  New Invoice
                </Button>
              )}
            </div>

            {/* Mobile menu trigger */}
            <div className="flex items-center sm:hidden gap-2">
              {currentPage !== 'create-invoice' && (
                <Button size="sm" onClick={() => navigate('create-invoice')} className="text-xs py-1 px-2">
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              )}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-1.5 text-slate-600 rounded-md hover:bg-slate-100"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile dropdown nav */}
          {mobileMenuOpen && (
            <div className="md:hidden py-3 border-t border-slate-100 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.id)}
                    className={`flex items-center gap-2 w-full px-3 py-2 rounded-md text-xs font-medium text-left ${
                      isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
              <div className="pt-2 px-3 flex items-center gap-1 text-[11px] text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>100% Local-First (Browser Storage)</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {currentPage === 'dashboard' && <Dashboard onNavigate={navigate} />}
        {currentPage === 'invoices' && <Invoices onNavigate={navigate} />}
        {currentPage === 'create-invoice' && (
          <CreateInvoice onNavigate={navigate} />
        )}
        {currentPage === 'edit-invoice' && (
          <CreateInvoice invoiceId={activeId} onNavigate={navigate} />
        )}
        {currentPage === 'invoice-details' && (
          <InvoiceDetails invoiceId={activeId} onNavigate={navigate} />
        )}
        {currentPage === 'customers' && <Customers onNavigate={navigate} />}
        {currentPage === 'products' && <Products />}
        {currentPage === 'settings' && <Settings />}
      </main>

      {/* Subtle, restrained footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-xs text-slate-400 no-print">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <span className="font-semibold text-slate-600">BillGST</span> — Local-First GST Invoicing for India
          </div>
          <div className="text-[11px] text-slate-400">
            No accounts • No cloud sync • Private & Offline capable
          </div>
        </div>
      </footer>
    </div>
  );
}