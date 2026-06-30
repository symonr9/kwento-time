import { Platform } from 'react-native';

const WEB_AVATAR_PREFIX = 'kwento-avatar://';
const WEB_AVATAR_STORAGE_PREFIX = 'kwento.avatar.';

function canUseWebStorage() {
  return Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function createAvatarKey() {
  return `${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
}

export function isInlineAvatarUri(uri: string | null | undefined) {
  return typeof uri === 'string' && uri.startsWith('data:image/');
}

export function isStoredWebAvatarUri(uri: string | null | undefined) {
  return typeof uri === 'string' && uri.startsWith(WEB_AVATAR_PREFIX);
}

export async function persistAvatarReference(uri: string | null | undefined) {
  if (!uri) {
    return null;
  }

  if (!isInlineAvatarUri(uri) || !canUseWebStorage()) {
    return uri;
  }

  const key = createAvatarKey();
  window.localStorage.setItem(`${WEB_AVATAR_STORAGE_PREFIX}${key}`, uri);
  return `${WEB_AVATAR_PREFIX}${key}`;
}

export function resolveAvatarReference(uri: string | null | undefined) {
  if (!uri || !isStoredWebAvatarUri(uri) || !canUseWebStorage()) {
    return uri ?? null;
  }

  return window.localStorage.getItem(`${WEB_AVATAR_STORAGE_PREFIX}${uri.slice(WEB_AVATAR_PREFIX.length)}`) ?? null;
}
