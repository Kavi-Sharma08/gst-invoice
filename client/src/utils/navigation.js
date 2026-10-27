import { useNavigate } from 'react-router-dom';

/**
 * Maps legacy page names and IDs to React Router route paths.
 * @param {string} page Page name or route path
 * @param {string} [id] Optional resource ID
 * @returns {string} URL path
 */
export function toAppRoute(page, id = null) {
  if (!page) return '/dashboard';
  if (page.startsWith('/')) return page;

  switch (page) {
    case 'dashboard':
      return '/dashboard';
    case 'invoices':
      return '/invoices';
    case 'create-invoice':
      return '/invoices/new';
    case 'edit-invoice':
      return id ? `/invoices/${id}/edit` : '/invoices/new';
    case 'invoice-details':
      return id ? `/invoices/${id}` : '/invoices';
    case 'customers':
      return '/customers';
    case 'products':
      return '/products';
    case 'settings':
      return '/settings';
    case 'login':
    case 'sign-in':
      return '/sign-in';
    case 'register':
    case 'sign-up':
      return '/sign-up';
    default:
      return `/${page}`;
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
