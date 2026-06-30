import AsyncStorage from '@react-native-async-storage/async-storage';

const lifeUpdateReminderDismissedUntilKey = 'kwento-time:life-update-reminder-dismissed-until';
const DAY_MS = 24 * 60 * 60 * 1000;

export async function getLifeUpdateReminderDismissedUntil() {
  const value = await AsyncStorage.getItem(lifeUpdateReminderDismissedUntilKey);
  const timestamp = value ? Number(value) : Number.NaN;
  return Number.isFinite(timestamp) ? new Date(timestamp) : null;
}

export async function dismissLifeUpdateReminderForOneDay(now = new Date()) {
  const dismissedUntil = new Date(now.getTime() + DAY_MS);
  await AsyncStorage.setItem(lifeUpdateReminderDismissedUntilKey, String(dismissedUntil.getTime()));
  return dismissedUntil;
}

export async function clearExpiredLifeUpdateReminderDismissal(now = new Date()) {
  const dismissedUntil = await getLifeUpdateReminderDismissedUntil();

  if (dismissedUntil && dismissedUntil <= now) {
    await AsyncStorage.removeItem(lifeUpdateReminderDismissedUntilKey);
    return null;
  }

  return dismissedUntil;
}
