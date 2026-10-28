import React, { useState, Suspense, lazy } from 'react';
import {
  Routes,
  Route,
  Navigate,
  NavLink,
  Link,
  useNavigate,
  useLocation,
  useParams
} from 'react-router-dom';
import {
  FileText,
  Users,
  Package,
  Settings as SettingsIcon,
  LayoutDashboard,
  Plus,
  Menu,
  X
} from 'lucide-react';
import { UserButton } from '@clerk/clerk-react';
import { useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Button } from './components/ui/Button';
import { LoadingFallback } from './components/ui/LoadingFallback';

// Route-based code splitting using React.lazy()
const LandingPage = lazy(() => import('./pages/LandingPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Invoices = lazy(() => import('./pages/Invoices'));
const CreateInvoice = lazy(() => import('./pages/CreateInvoice'));
const InvoiceDetails = lazy(() => import('./pages/InvoiceDetails'));
const Customers = lazy(() => import('./pages/Customers'));
const Products = lazy(() => import('./pages/Products'));
const Settings = lazy(() => import('./pages/Settings'));
const SignInPage = lazy(() => import('./pages/SignInPage'));
const SignUpPage = lazy(() => import('./pages/SignUpPage'));

function LegacyInvoiceRedirect() {
  const { id } = useParams();
  return <Navigate to={`/app/invoices/${id}`} replace />;
}

function LegacyInvoiceEditRedirect() {
  const { id } = useParams();
  return <Navigate to={`/app/invoices/${id}/edit`} replace />;
}

/** Shell that wraps all authenticated /app/* workspace routes */
function AppShell() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/app/invoices', label: 'Invoices', icon: FileText },
    { to: '/app/customers', label: 'Customers', icon: Users },
    { to: '/app/products', label: 'Products & Services', icon: Package },
    { to: '/app/settings', label: 'Settings', icon: SettingsIcon }
  ];

  const isCreatingInvoice = location.pathname === '/app/invoices/new';

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FB] text-[#0B0C0E] antialiased">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-200/70 no-print" role="banner">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-6">
              <Link
                to="/app/dashboard"
                className="flex items-center gap-2.5 group cursor-pointer"
                title="BillGST Dashboard"
              >
                <div className="w-8 h-8 rounded-xl bg-[#0B0C0E] text-white flex items-center justify-center font-bold text-sm shadow-xs transition-transform group-hover:scale-105">
                  ₹
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-base tracking-tight text-slate-900 font-heading">
                    BillGST
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200/80 px-1.5 py-0.5 rounded-full">
                    GST v2.0
                  </span>
                </div>
              </Link>

              {/* Desktop Nav Items */}
              <nav className="hidden md:flex items-center p-1 bg-slate-100/80 rounded-full border border-slate-200/60 shadow-2xs" aria-label="App navigation">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs transition-all duration-150 ${
                          isActive
                            ? 'bg-white text-slate-950 font-semibold shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-white/50 font-medium'
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

            {/* Right side: auth user profile & primary action */}
            <div className="hidden sm:flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium bg-slate-100 border border-slate-200/80 px-2.5 py-1 rounded-full shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="truncate max-w-[140px] font-medium">{user?.name || user?.email}</span>
                </div>
                <UserButton afterSignOutUrl="/" />
              </div>

              {!isCreatingInvoice && (
                <Button size="sm" onClick={() => navigate('/app/invoices/new')} className="text-xs shadow-xs">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  New Invoice
                </Button>
              )}
            </div>

            {/* Mobile menu trigger */}
            <div className="flex items-center sm:hidden gap-2">
              {!isCreatingInvoice && (
                <Button size="sm" onClick={() => navigate('/app/invoices/new')} className="text-xs py-1 px-2.5">
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              )}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile dropdown nav */}
          {mobileMenuOpen && (
            <div className="md:hidden py-3 border-t border-slate-100 space-y-1 animate-fade-in">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-xl text-xs font-medium text-left transition-colors ${
                        isActive ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
              <div className="pt-2 px-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 mt-2">
                <span className="text-slate-800 font-medium truncate max-w-[180px]">
                  {user?.name || user?.email}
                </span>
                <UserButton afterSignOutUrl="/" />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Routed Content */}
      <main id="main-content" className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Suspense fallback={<LoadingFallback message="Loading workspace..." />}>
          <Routes>
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="invoices/new" element={<CreateInvoice />} />
            <Route path="invoices/:id" element={<InvoiceDetails />} />
            <Route path="invoices/:id/edit" element={<CreateInvoice />} />
            <Route path="customers" element={<Customers />} />
            <Route path="products" element={<Products />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
          </Routes>
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/70 bg-white py-6 text-xs text-slate-500 no-print" role="contentinfo">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-[10px]">
              ₹
            </div>
            <span className="font-semibold text-slate-800">BillGST</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-400">GST-Compliant Invoicing for Indian Businesses</span>
          </div>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500" aria-label="Footer navigation">
            <Link to="/app/invoices/new" className="hover:text-slate-900 transition-colors">Create Invoice</Link>
            <Link to="/app/invoices" className="hover:text-slate-900 transition-colors">Tax Invoices</Link>
            <Link to="/app/settings" className="hover:text-slate-900 transition-colors">Business Settings</Link>
          </nav>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>MongoDB Connected</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<LoadingFallback message="Loading..." />}>
      <Routes>
        {/* Public Landing page at root */}
        <Route path="/" element={<LandingPage />} />

        {/* Public Auth routes */}
        <Route path="/sign-in/*" element={<SignInPage />} />
        <Route path="/sign-up/*" element={<SignUpPage />} />

        {/* Protected workspace: all /app/* routes require an authenticated Clerk session */}
        <Route
          path="/app/*"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        />

        {/* Legacy redirects: map old un-namespaced paths to /app/... */}
        <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
        <Route path="/invoices" element={<Navigate to="/app/invoices" replace />} />
        <Route path="/invoices/new" element={<Navigate to="/app/invoices/new" replace />} />
        <Route path="/invoices/:id" element={<LegacyInvoiceRedirect />} />
        <Route path="/invoices/:id/edit" element={<LegacyInvoiceEditRedirect />} />
        <Route path="/customers" element={<Navigate to="/app/customers" replace />} />
        <Route path="/products" element={<Navigate to="/app/products" replace />} />
        <Route path="/settings" element={<Navigate to="/app/settings" replace />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
