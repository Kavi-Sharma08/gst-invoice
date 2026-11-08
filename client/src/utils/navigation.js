import { useNavigate } from 'react-router-dom';
import { PATHS } from '@/app/routes/paths';

/**
 * Maps legacy page names and IDs to React Router route paths.
 * All authenticated workspace routes are namespaced under /app.
 * @param {string} page Page name or route path
 * @param {string} [id] Optional resource ID
 * @returns {string} URL path
 */
export function toAppRoute(page, id = null) {
  if (!page) return PATHS.APP.DASHBOARD;
  if (page.startsWith('/')) {
    // If it starts with /dashboard, /invoices, etc., prefix with /app
    if (page === '/dashboard' || page.startsWith('/dashboard/')) return `${PATHS.APP.ROOT}${page}`;
    if (page === '/invoices' || page.startsWith('/invoices/')) return `${PATHS.APP.ROOT}${page}`;
    if (page === '/customers' || page.startsWith('/customers/')) return `${PATHS.APP.ROOT}${page}`;
    if (page === '/products' || page.startsWith('/products/')) return `${PATHS.APP.ROOT}${page}`;
    if (page === '/settings' || page.startsWith('/settings/')) return `${PATHS.APP.ROOT}${page}`;
    return page;
  }

  switch (page) {
    case 'dashboard':
      return PATHS.APP.DASHBOARD;
    case 'invoices':
      return PATHS.APP.INVOICES;
    case 'create-invoice':
      return PATHS.APP.INVOICE_NEW;
    case 'edit-invoice':
      return id ? PATHS.APP.invoiceEdit(id) : PATHS.APP.INVOICE_NEW;
    case 'invoice-details':
      return id ? PATHS.APP.invoice(id) : PATHS.APP.INVOICES;
    case 'customers':
      return id ? PATHS.APP.customer(id) : PATHS.APP.CUSTOMERS;
    case 'customer-details':
      return id ? PATHS.APP.customer(id) : PATHS.APP.CUSTOMERS;
    case 'products':
      return PATHS.APP.PRODUCTS;
    case 'settings':
      return PATHS.APP.SETTINGS;
    case 'login':
    case 'sign-in':
      return PATHS.AUTH.SIGN_IN;
    case 'register':
    case 'sign-up':
      return PATHS.AUTH.SIGN_UP;
    default:
      return `${PATHS.APP.ROOT}/${page}`;
  }
}

/**
 * Convenient hook for application navigation that accepts both
 * traditional (page, id) arguments and standard URL paths.
 */
export function useAppNavigate() {
  const navigate = useNavigate();

  return (page, id = null, options = {}) => {
    const route = toAppRoute(page, id);
    navigate(route, options);
  };
}
