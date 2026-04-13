import { CustomerPayload } from './api';
import { getItem, setItem, removeItem } from './storage';

/**
 * Persistent auth state. Uses the cross-platform storage wrapper in
 * `./storage` so the same code works on iOS/Android (Keychain/Keystore)
 * and on web (localStorage).
 */

const TOKEN_KEY = 'stamply.customer.token';
const CUSTOMER_KEY = 'stamply.customer';

export async function setAuth(token: string, customer: CustomerPayload) {
  await setItem(TOKEN_KEY, token);
  await setItem(CUSTOMER_KEY, JSON.stringify(customer));
}

export async function getToken(): Promise<string | null> {
  return getItem(TOKEN_KEY);
}

export async function getCachedCustomer(): Promise<CustomerPayload | null> {
  const raw = await getItem(CUSTOMER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CustomerPayload;
  } catch {
    return null;
  }
}

export async function clearAuth() {
  await removeItem(TOKEN_KEY);
  await removeItem(CUSTOMER_KEY);
}

export async function isAuthenticated(): Promise<boolean> {
  return (await getToken()) !== null;
}
