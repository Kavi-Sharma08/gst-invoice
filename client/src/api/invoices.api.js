import { apiClient } from './http-client.js';

export const invoiceQueryKeys = {
  all: ['invoices'],
  lists: () => ['invoices', 'list'],
  list: (filters) => ['invoices', 'list', filters],
  counts: (filters) => ['invoices', 'counts', filters],
  summary: (customerId) => ['invoices', 'summary', customerId || 'all'],
  detail: (id) => ['invoices', 'detail', id],
  nextNumber: () => ['invoices', 'nextNumber']
};

export const invoicesApi = {
  // Query endpoints
  list: (params) => apiClient.get('/invoices', params),
  getCounts: (params) => apiClient.get('/invoices/counts', params),
  getSummary: (customerId) =>
    apiClient.get('/invoices/summary', customerId ? { customerId } : undefined),
  getNextNumber: () => apiClient.get('/invoices/next-number'),
  get: (id) => apiClient.get(`/invoices/${id}`),

  // Mutation endpoints
  createDraft: (data) => apiClient.post('/invoices', data),
  updateDraft: (id, data) => apiClient.put(`/invoices/${id}`, data),
  deleteDraft: (id) => apiClient.delete(`/invoices/${id}`),
  issue: (id) => apiClient.post(`/invoices/${id}/issue`, {}),
  cancel: (id) => apiClient.post(`/invoices/${id}/cancel`, {}),
  markPaid: (id) => apiClient.post(`/invoices/${id}/mark-paid`, {}),
  markUnpaid: (id) => apiClient.post(`/invoices/${id}/mark-unpaid`, {}),
  duplicate: (id) => apiClient.post(`/invoices/${id}/duplicate`, {}),

  // Email endpoints
  sendEmail: (id, data) => apiClient.post(`/invoices/${id}/email`, data),
  getEmailStatus: (id) => apiClient.get(`/invoices/${id}/email-status`),

  // Backwards compatibility aliases
  create: (data) => apiClient.post('/invoices', data),
  update: (id, data) => apiClient.put(`/invoices/${id}`, data),
  delete: (id) => apiClient.delete(`/invoices/${id}`)
};

export default invoicesApi;
