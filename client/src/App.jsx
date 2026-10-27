import React, { useState, Suspense, lazy } from 'react';
import {
  Routes,
  Route,
  Navigate,
  NavLink,
  Link,
  useNavigate,
  useLocation
} from 'react-router-dom';
import {
  FileText,
  Users,
  Package,
  Settings as SettingsIcon,
  LayoutDashboard,
  Plus,
  ShieldCheck,
  Cloud,
  Menu,
  X,
  LogIn
} from 'lucide-react';
import { SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';
import { useAuth } from './context/AuthContext';
import { MigrationBanner } from './components/MigrationBanner';
import { Button } from './components/ui/Button';
import { LoadingFallback } from './components/ui/LoadingFallback';

// Route-based code splitting using React.lazy()
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Invoices = lazy(() => import('./pages/Invoices'));
const CreateInvoice = lazy(() => import('./pages/CreateInvoice'));
const InvoiceDetails = lazy(() => import('./pages/InvoiceDetails'));
const Customers = lazy(() => import('./pages/Customers'));
const Products = lazy(() => import('./pages/Products'));
const Settings = lazy(() => import('./pages/Settings'));
const SignInPage = lazy(() => import('./pages/SignInPage'));
const SignUpPage = lazy(() => import('./pages/SignUpPage'));

export default function App() {
  const { user, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/invoices', label: 'Invoices', icon: FileText },
    { to: '/customers', label: 'Customers', icon: Users },
    { to: '/products', label: 'Products & Services', icon: Package },
    { to: '/settings', label: 'Settings', icon: SettingsIcon }
  ];

  const isCreatingInvoice = location.pathname === '/invoices/new';
  const isAuthPage = location.pathname.startsWith('/sign-in') || location.pathname.startsWith('/sign-up');

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFC] text-[#1E2024]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-slate-200 no-print" role="banner">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <div className="flex items-center gap-6">
              <Link
                to="/dashboard"
                className="flex items-center gap-2 font-bold text-base tracking-tight text-slate-900 cursor-pointer"
              >
                <div className="w-7 h-7 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                  ₹
                </div>
                <span>BillGST</span>
              </Link>

              {/* Desktop Nav Items */}
              <nav className="hidden md:flex items-center gap-1" aria-label="App navigation">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-slate-100 text-slate-900'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`
                      }
                    >
                      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            {/* Right side: auth & primary action */}
            <div className="hidden sm:flex items-center gap-3">
              {/* Clerk: show user info when signed in */}
              <SignedIn>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-[11px] text-slate-700 font-medium bg-emerald-50 border border-emerald-200 px-2 py-1 rounded">
                    <Cloud className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate max-w-[120px]">{user?.name || user?.email}</span>
                  </div>
                  {/* Clerk's built-in user button */}
                  <UserButton afterSignOutUrl="/dashboard" />
                </div>
              </SignedIn>

              {/* Clerk: show sign in button when signed out */}
              <SignedOut>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium bg-slate-50 border border-slate-200 px-2 py-1 rounded">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Local Mode</span>
                  </div>
                  <Link
                    to="/sign-in"
                    id="nav-sign-in-btn"
                    className="flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900 px-2.5 py-1 rounded border border-slate-300 hover:border-slate-400 cursor-pointer transition-colors"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </Link>
                </div>
              </SignedOut>

              {!isCreatingInvoice && !isAuthPage && (
                <Button size="sm" onClick={() => navigate('/invoices/new')} className="text-xs">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  New Invoice
                </Button>
              )}
            </div>

            {/* Mobile menu trigger */}
            <div className="flex items-center sm:hidden gap-2">
              {!isCreatingInvoice && !isAuthPage && (
                <Button size="sm" onClick={() => navigate('/invoices/new')} className="text-xs py-1 px-2">
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
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2 w-full px-3 py-2 rounded-md text-xs font-medium text-left ${
                        isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
              <div className="pt-2 px-3 flex items-center justify-between text-[11px] text-slate-500">
                <SignedIn>
                  <div className="flex items-center justify-between w-full">
                    <span className="text-emerald-700 font-medium">
                      {user?.name || user?.email}
                    </span>
                    <UserButton afterSignOutUrl="/dashboard" />
                  </div>
                </SignedIn>
                <SignedOut>
                  <Link
                    to="/sign-in"
                    onClick={() => setMobileMenuOpen(false)}
                    id="mobile-sign-in-btn"
                    className="text-slate-800 font-semibold flex items-center gap-1"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In / Register</span>
                  </Link>
                </SignedOut>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Migration Banner (only shows when user has local IndexedDB data and is signed in) */}
      <MigrationBanner onMigrationSuccess={() => navigate('/dashboard')} />

      {/* Main Routed Content with Suspense Fallback */}
      <main id="main-content" className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Suspense fallback={<LoadingFallback message="Loading page..." />}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/invoices/new" element={<CreateInvoice />} />
            <Route path="/invoices/:id" element={<InvoiceDetails />} />
            <Route path="/invoices/:id/edit" element={<CreateInvoice />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/products" element={<Products />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/sign-in/*" element={<SignInPage />} />
            <Route path="/sign-up/*" element={<SignUpPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-xs text-slate-400 no-print" role="contentinfo">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <span className="font-semibold text-slate-600">BillGST</span> — Production-Ready GST Invoicing for India
          </div>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400" aria-label="Footer navigation">
            <Link to="/invoices/new" className="hover:text-slate-600 transition-colors">GST Invoice Generator</Link>
            <Link to="/invoices" className="hover:text-slate-600 transition-colors">PDF Invoices</Link>
            <Link to="/settings" className="hover:text-slate-600 transition-colors">GST Settings</Link>
          </nav>
          <div className="text-[11px] text-slate-400">
            {isAuthenticated ? 'Cloud Storage Active (MongoDB)' : 'Offline Local Storage (Browser DB)'}
          </div>
        </div>
      </footer>
    </div>
  );
}