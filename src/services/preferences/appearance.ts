import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppearanceMode = 'system' | 'light' | 'dark';

const appearanceModeKey = 'kwento-time:appearance-mode';
const validAppearanceModes = new Set<AppearanceMode>(['system', 'light', 'dark']);

export async function getAppearanceMode(): Promise<AppearanceMode> {
  const value = await AsyncStorage.getItem(appearanceModeKey);
  return validAppearanceModes.has(value as AppearanceMode) ? (value as AppearanceMode) : 'system';
}

export async function setAppearanceMode(mode: AppearanceMode) {
  await AsyncStorage.setItem(appearanceModeKey, mode);
}
