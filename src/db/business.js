import { db } from './database';

const DEFAULT_PROFILE_ID = 'primary_business';

export async function getBusinessProfile() {
  try {
    const profile = await db.business.get(DEFAULT_PROFILE_ID);
    return profile || null;
  } catch (error) {
    console.error('Failed to get business profile from IndexedDB:', error);
    throw new Error('Unable to retrieve business profile from local storage.');
  }
}

export async function saveBusinessProfile(data) {
  try {
    const now = new Date().toISOString();
    const existing = await db.business.get(DEFAULT_PROFILE_ID);

    const record = {
      ...data,
      id: DEFAULT_PROFILE_ID,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };

    await db.business.put(record);
    return record;
  } catch (error) {
    console.error('Failed to save business profile to IndexedDB:', error);
    throw new Error('Unable to save business profile to local storage.');
  }
}
