import { apiClient } from './http-client.js';

export const customerQueryKeys = {
  all: ['customers'],
  lists: () => ['customers', 'list'],
  list: (filters) => ['customers', 'list', filters || {}],
  search: (q) => ['customers', 'search', q || ''],
  detail: (id) => ['customers', 'detail', id]
};

export const customersApi = {
  list: (params) => apiClient.get('/customers', params),
  search: (params) =>
    apiClient.get('/customers/search', typeof params === 'string' ? { q: params } : params),
  get: (id) => apiClient.get(`/customers/${id}`),
  create: (data) => apiClient.post('/customers', data),
  update: (id, data) => apiClient.patch(`/customers/${id}`, data),
  remove: (id) => apiClient.delete(`/customers/${id}`),
  delete: (id) => apiClient.delete(`/customers/${id}`),
  archive: (id) => apiClient.post(`/customers/${id}/archive`),
  unarchive: (id) => apiClient.post(`/customers/${id}/unarchive`)
};

export default customersApi;
