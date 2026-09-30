import { db } from './database';
import { DEFAULT_INVOICE_PREFIX, DEFAULT_STARTING_NUMBER } from '../utils/invoiceNumber';

const DEFAULT_SETTINGS = {
  invoicePrefix: DEFAULT_INVOICE_PREFIX,
  startingNumber: DEFAULT_STARTING_NUMBER,
  defaultNotes: 'Thank you for your business! Please settle the payment within the due date.',
  defaultTerms: '1. Payment due within 15 days of invoice date.\n2. Interest @ 18% p.a. will be charged for delayed payments.\n3. Subject to local jurisdiction only.',
  bankDetails: {
    accountName: '',
    accountNumber: '',
    bankName: '',
    ifscCode: '',
    branch: '',
    upiId: ''
  }
};

export async function getSettings() {
  try {
    const records = await db.settings.toArray();
    const result = { ...DEFAULT_SETTINGS };
    for (const r of records) {
      result[r.key] = r.value;
    }
    return result;
  } catch (error) {
    console.error('Failed to get settings:', error);
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(newSettings) {
  try {
    const keys = Object.keys(newSettings);
    await db.transaction('rw', db.settings, async () => {
      for (const k of keys) {
        await db.settings.put({ key: k, value: newSettings[k] });
      }
    });
    return await getSettings();
  } catch (error) {
    console.error('Failed to save settings:', error);
    throw new Error('Unable to save settings to local storage.');
  }
}
