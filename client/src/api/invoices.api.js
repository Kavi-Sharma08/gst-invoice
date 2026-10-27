import { apiClient } from './http-client.js';

export const invoicesApi = {
  list: (params) => apiClient.get('/invoices', params),
  get: (id) => apiClient.get(`/invoices/${id}`),
  create: (data) => apiClient.post('/invoices', data),
  update: (id, data) => apiClient.patch(`/invoices/${id}`, data),
  delete: (id) => apiClient.delete(`/invoices/${id}`),
  duplicate: (id) => apiClient.post(`/invoices/${id}/duplicate`, {}),
  sendEmail: (id, data) => apiClient.post(`/invoices/${id}/email`, data),
  getEmailStatus: (id) => apiClient.get(`/invoices/${id}/email-status`)
};
