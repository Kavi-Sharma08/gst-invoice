import { useNavigate } from 'react-router-dom';

/**
 * Maps legacy page names and IDs to React Router route paths.
 * All authenticated workspace routes are namespaced under /app.
 * @param {string} page Page name or route path
 * @param {string} [id] Optional resource ID
 * @returns {string} URL path
 */
export function toAppRoute(page, id = null) {
  if (!page) return '/app/dashboard';
  if (page.startsWith('/')) {
    // If it starts with /dashboard, /invoices, etc., prefix with /app
    if (page === '/dashboard' || page.startsWith('/dashboard/')) return `/app${page}`;
    if (page === '/invoices' || page.startsWith('/invoices/')) return `/app${page}`;
    if (page === '/customers' || page.startsWith('/customers/')) return `/app${page}`;
    if (page === '/products' || page.startsWith('/products/')) return `/app${page}`;
    if (page === '/settings' || page.startsWith('/settings/')) return `/app${page}`;
    return page;
  }

  switch (page) {
    case 'dashboard':
      return '/app/dashboard';
    case 'invoices':
      return '/app/invoices';
    case 'create-invoice':
      return '/app/invoices/new';
    case 'edit-invoice':
      return id ? `/app/invoices/${id}/edit` : '/app/invoices/new';
    case 'invoice-details':
      return id ? `/app/invoices/${id}` : '/app/invoices';
    case 'customers':
      return '/app/customers';
    case 'products':
      return '/app/products';
    case 'settings':
      return '/app/settings';
    case 'login':
    case 'sign-in':
      return '/sign-in';
    case 'register':
    case 'sign-up':
      return '/sign-up';
    default:
      return `/app/${page}`;
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
