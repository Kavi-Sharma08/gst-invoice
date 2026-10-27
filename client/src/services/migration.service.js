import { db } from '../db/database.js';
import { exportBackup } from '../db/backup.js';
import { migrationApi } from '../api/migration.api.js';

const MIGRATION_DONE_KEY = 'billgst_migration_completed';
const MIGRATION_DISMISSED_KEY = 'billgst_migration_dismissed';

export const migrationService = {
  /**
   * Checks whether the user has existing data stored locally in IndexedDB.
   */
  hasLocalData: async () => {
    try {
      const [invoiceCount, customerCount, productCount, business] = await Promise.all([
        db.invoices.count(),
        db.customers.count(),
        db.products.count(),
        db.business.toArray()
      ]);
      const hasBiz = business.length > 0 && !!business[0].businessName;
      return invoiceCount > 0 || customerCount > 0 || productCount > 0 || hasBiz;
    } catch (err) {
      console.warn('Failed to check IndexedDB local data:', err);
      return false;
    }
  },

  /**
   * Returns summary counts of local IndexedDB data.
   */
  getLocalDataSummary: async () => {
    try {
      const [invoices, customers, products, business] = await Promise.all([
        db.invoices.count(),
        db.customers.count(),
        db.products.count(),
        db.business.toArray()
      ]);
      return {
        invoices,
        customers,
        products,
        hasBusiness: business.length > 0 && !!business[0].businessName
      };
    } catch {
      return { invoices: 0, customers: 0, products: 0, hasBusiness: false };
    }
  },

  isCompleted: () => {
    return localStorage.getItem(MIGRATION_DONE_KEY) === 'true';
  },

  isDismissed: () => {
    return sessionStorage.getItem(MIGRATION_DISMISSED_KEY) === 'true';
  },

  dismiss: () => {
    sessionStorage.setItem(MIGRATION_DISMISSED_KEY, 'true');
  },

  markCompleted: () => {
    localStorage.setItem(MIGRATION_DONE_KEY, 'true');
  },

  /**
   * Downloads a local JSON backup file to the user's computer.
   */
  downloadBackup: () => exportBackup(),

  /**
   * Gathers all local IndexedDB tables and sends them to the MongoDB migration API.
   */
  migrateToCloud: async () => {
    const [businessArr, customers, products, invoices, settings] = await Promise.all([
      db.business.toArray(),
      db.customers.toArray(),
      db.products.toArray(),
      db.invoices.toArray(),
      db.settings.toArray()
    ]);

    const business = businessArr.length > 0 ? businessArr[0] : null;

    const payload = {
      business,
      customers,
      products,
      invoices,
      settings
    };

    const response = await migrationApi.import(payload);
    localStorage.setItem(MIGRATION_DONE_KEY, 'true');
    return response.data;
  }
};
