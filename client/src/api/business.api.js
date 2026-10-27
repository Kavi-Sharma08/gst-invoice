import { apiClient } from './http-client.js';

export const businessApi = {
  get: () => apiClient.get('/business-profile'),
  save: (data) => apiClient.post('/business-profile', data)
};
