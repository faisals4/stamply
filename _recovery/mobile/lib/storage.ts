import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Cross-platform key/value storage.
 *
 * - **iOS / Android**: expo-secure-store → Keychain / Keystore.
 *   The token is protected by device secure enclave and is not
 *   readable from JS-accessible storage.
 * - **Web**: `localStorage`. Not as strong as native secure storage —
 *   any XSS on the same origin can exfiltrate the token — but it's
 *   the pragmatic choice for a web build and matches how most SPAs
 *   handle bearer tokens. Mitigate with a tight CSP and SameSite
 *   cookies on the API domain in production.
 *
 * SecureStore keys must be alphanumeric + dot/underscore/hyphen,
 * which matches the existing `stamply.xxx` convention used by
 * callers of this module.
 */

const isWeb = Platform.OS === 'web';

export async function getItem(key: string): Promise<string | null> {
  if (isWeb) {
    try {
      return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

export async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    try {
      if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
    } catch {
      /* quota exceeded or private mode — swallow */
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function removeItem(key: string): Promise<void> {
  if (isWeb) {
    try {
      if (typeof window !== 'undefined') window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
