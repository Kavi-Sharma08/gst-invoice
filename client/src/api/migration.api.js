import { apiClient } from './http-client.js';

/**
 * Submits a full IndexedDB backup JSON to the server migration endpoint.
 * @param {Object} backupData - The parsed backup object from db/backup.js exportBackup()
 */
export const migrationApi = {
  import: (backupData) => apiClient.post('/migration/import', backupData)
};
