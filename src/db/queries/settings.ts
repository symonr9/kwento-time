import { eq } from 'drizzle-orm';

import { getDb } from '../client';
import { appSettings } from '../schema';

export const BIOMETRIC_LOCK_SETTING_KEY = 'biometric_lock_enabled';

export async function getBooleanSetting(key: string, fallback = false) {
  const db = await getDb();
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
  return row ? row.value === 'true' : fallback;
}

export async function setBooleanSetting(key: string, value: boolean) {
  const db = await getDb();
  await db
    .insert(appSettings)
    .values({ key, value: value ? 'true' : 'false' })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: {
        value: value ? 'true' : 'false',
        updatedAt: new Date(),
      },
    });
}

export async function isBiometricLockEnabled() {
  return getBooleanSetting(BIOMETRIC_LOCK_SETTING_KEY, false);
}

export async function setBiometricLockEnabled(value: boolean) {
  await setBooleanSetting(BIOMETRIC_LOCK_SETTING_KEY, value);
}
