import { BusinessProfile } from './business.model.js';

export async function getBusinessProfile(userId) {
  let profile = await BusinessProfile.findOne({ userId });
  if (!profile) {
    // Return empty shell or null
    return null;
  }
  return profile.toJSON();
}

export async function saveBusinessProfile(userId, data) {
  const profile = await BusinessProfile.findOneAndUpdate(
    { userId },
    { ...data, userId },
    { upsert: true, new: true, runValidators: true }
  );
  return profile.toJSON();
}
