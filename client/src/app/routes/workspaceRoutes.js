import { lazy } from 'react';

const Dashboard = lazy(() => import('@/features/dashboard'));
const Invoices = lazy(() => import('@/pages/Invoices'));
const CreateInvoice = lazy(() => import('@/pages/CreateInvoice'));
const InvoiceDetails = lazy(() => import('@/pages/InvoiceDetails'));
const Customers = lazy(() => import('@/pages/Customers'));
const CustomerDetails = lazy(() => import('@/pages/CustomerDetails'));
const Products = lazy(() => import('@/pages/Products'));
const Settings = lazy(() => import('@/pages/Settings'));

export const workspaceRoutes = [
  { index: true, Component: Dashboard },
  { path: 'dashboard', Component: Dashboard },
  { path: 'invoices', Component: Invoices },
  { path: 'invoices/new', Component: CreateInvoice },
  { path: 'invoices/:id', Component: InvoiceDetails },
  { path: 'invoices/:id/edit', Component: CreateInvoice },
  { path: 'customers', Component: Customers },
  { path: 'customers/:id', Component: CustomerDetails },
  { path: 'products', Component: Products },
  { path: 'settings', Component: Settings },
];

export default workspaceRoutes;

