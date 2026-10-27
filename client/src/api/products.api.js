import { apiClient } from './http-client.js';

export const productsApi = {
  list: (params) => apiClient.get('/products', params),
  get: (id) => apiClient.get(`/products/${id}`),
  create: (data) => apiClient.post('/products', data),
  update: (id, data) => apiClient.patch(`/products/${id}`, data),
  delete: (id) => apiClient.delete(`/products/${id}`)
};
