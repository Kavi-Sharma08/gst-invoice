import { apiClient } from './http-client.js';

export const customersApi = {
  list: (params) => apiClient.get('/customers', params),
  get: (id) => apiClient.get(`/customers/${id}`),
  create: (data) => apiClient.post('/customers', data),
  update: (id, data) => apiClient.patch(`/customers/${id}`, data),
  delete: (id) => apiClient.delete(`/customers/${id}`)
};
