import React, { Suspense, lazy } from 'react';
import {
  Routes,
  Route,
  Navigate,
  useParams
} from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoadingFallback } from './components/ui/LoadingFallback';
import { AceternitySidebar } from './components/layout/AceternitySidebar';
import './styles/dashboard.css';

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

/** Shell that wraps all authenticated /app/* workspace routes with Aceternity UI Sidebar */
function AppShell() {
  return (
    <div className="dashboard-app">
      <AceternitySidebar />
      <div className="flex-1 w-full min-w-0 overflow-y-auto">
        <Suspense fallback={<LoadingFallback message="Loading workspace..." />}>
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="invoices/new" element={<CreateInvoice />} />
            <Route path="invoices/:id" element={<InvoiceDetails />} />
            <Route path="invoices/:id/edit" element={<CreateInvoice />} />
            <Route path="customers" element={<Customers />} />
            <Route path="products" element={<Products />} />
            <Route path="reports" element={<Dashboard />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
          </Routes>
        </Suspense>
      </div>
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
