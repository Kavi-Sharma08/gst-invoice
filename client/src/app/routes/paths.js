/**
 * Centralized application route paths and route helper builders.
 * Single source of truth for all navigation paths across BillGST.
 */
export const PATHS = {
  ROOT: '/',
  AUTH: {
    SIGN_IN: '/sign-in',
    SIGN_UP: '/sign-up',
    SSO_CALLBACK_SIGN_IN: '/sign-in/sso-callback',
    SSO_CALLBACK_SIGN_UP: '/sign-up/sso-callback',
  },
  APP: {
    ROOT: '/app',
    DASHBOARD: '/app/dashboard',
    INVOICES: '/app/invoices',
    INVOICE_NEW: '/app/invoices/new',
    CUSTOMERS: '/app/customers',
    PRODUCTS: '/app/products',
    SETTINGS: '/app/settings',
    invoice: (id) => `/app/invoices/${id}`,
    invoiceEdit: (id) => `/app/invoices/${id}/edit`,
    customer: (id) => `/app/customers/${id}`,
  },
  // Top-level aliases for convenient direct access
  root: '/',
  dashboard: '/app/dashboard',
  signIn: '/sign-in',
  signUp: '/sign-up',
  invoice: (id) => `/app/invoices/${id}`,
  invoiceEdit: (id) => `/app/invoices/${id}/edit`,
  customer: (id) => `/app/customers/${id}`,
};

export default PATHS;

