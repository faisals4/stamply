import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

/**
 * Merchant user returned by `POST /api/login` and `GET /api/me`.
 */
export type MerchantUser = {
  id: number;
  name: string;
  email: string;
  tenant_id: number;
  tenant_name?: string;
  role?: string;
};

/**
 * Dashboard stats from `GET /api/dashboard/stats`.
 */
export type DashboardStats = {
  customers: number;
  cards: number;
  active_cards: number;
  issued_cards: number;
  stamps_today: number;
  redemptions_today: number;
  new_customers_today: number;
  stamps_week: number;
  active_customers_week: number;
  new_customers_month: number;
  total_rewards_redeemed: number;
  upcoming_birthdays_week: number;
};

/**
 * Marketing reach per channel from `GET /messages/reach`.
 */
export type ReachChannel = {
  reachable: number;
  percentage: number;
};

export type ReachSummary = {
  total_customers: number;
  email: ReachChannel;
  sms: ReachChannel;
  push: ReachChannel;
  wallet: ReachChannel;
};

// ─── Token storage ───────────────────────────────────────────

const TOKEN_KEY = 'stamply.merchant.token';
const USER_KEY = 'stamply.merchant.user';

function getStorage() {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    return localStorage;
  }
  // Fallback in-memory for native (swap with SecureStore later).
  const mem: Record<string, string> = {};
  return {
    getItem: (k: string) => mem[k] ?? null,
    setItem: (k: string, v: string) => { mem[k] = v; },
    removeItem: (k: string) => { delete mem[k]; },
  };
}

async function getStoredToken(): Promise<string | null> {
  return getStorage().getItem(TOKEN_KEY);
}

async function setStoredToken(token: string, user: MerchantUser) {
  const s = getStorage();
  s.setItem(TOKEN_KEY, token);
  s.setItem(USER_KEY, JSON.stringify(user));
}

async function clearStoredToken() {
  const s = getStorage();
  s.removeItem(TOKEN_KEY);
  s.removeItem(USER_KEY);
}

function getStoredUser(): MerchantUser | null {
  try {
    const raw = getStorage().getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ─── API helpers ─────────────────────────────────────────────

function resolveApiUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/api`;
  }
  // Native: use the same configured API URL as the customer app
  const Constants = require('expo-constants').default;
  const fromConfig = (Constants.expoConfig?.extra as any)?.apiUrl;
  return fromConfig || 'https://stamply.ngrok.app/api';
}

async function merchantFetch<T>(
  path: string,
  opts: RequestInit = {}
): Promise<T> {
  const token = await getStoredToken();
  const res = await fetch(`${resolveApiUrl()}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  });
  if (res.status === 401) {
    await clearStoredToken();
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export const merchantApi = {
  login: (email: string, password: string) =>
    merchantFetch<{ token: string; user: MerchantUser }>('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  signup: (data: { brand_name: string; subdomain: string; name: string; email: string; password: string }) =>
    merchantFetch<{ token: string; user: MerchantUser; tenant: any }>('/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  me: () => merchantFetch<{ data: MerchantUser }>('/me'),

  dashboardStats: () =>
    merchantFetch<{ data: DashboardStats }>('/dashboard/stats'),

  messagesReach: () =>
    merchantFetch<{ data: ReachSummary }>('/messages/reach'),

  // ── Card CRUD ──
  listCards: (page = 1) =>
    merchantFetch<{ data: any[]; meta?: { current_page: number; last_page: number } }>(`/cards?page=${page}&per_page=20`),

  getCard: (id: number | string) =>
    merchantFetch<{ data: any }>(`/cards/${id}`),

  createCard: (body: Record<string, any>) =>
    merchantFetch<{ data: any }>('/cards', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateCard: (id: number | string, body: Record<string, any>) =>
    merchantFetch<{ data: any }>(`/cards/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  deleteCard: (id: number | string) =>
    merchantFetch<{ ok: boolean }>(`/cards/${id}`, { method: 'DELETE' }),

  getNotifications: (id: number | string) =>
    merchantFetch<{ data: { triggers: any; available: string[] } }>(`/cards/${id}/notifications`),

  updateNotifications: (id: number | string, triggers: Record<string, any>) =>
    merchantFetch<{ data: any }>(`/cards/${id}/notifications`, {
      method: 'PUT',
      body: JSON.stringify({ triggers }),
    }),

  // ── Customers ──
  listCustomers: (params: Record<string, string>) =>
    merchantFetch<{ data: any[]; meta: any }>(`/customers?${new URLSearchParams(params)}`),

  getCustomer: (id: number | string) =>
    merchantFetch<{ data: any }>(`/customers/${id}`),

  updateCustomer: (id: number | string, body: Record<string, any>) =>
    merchantFetch<{ data: any }>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  // ── Cashier Scanner ──
  cashierLookup: (serial: string) =>
    merchantFetch<{ data: any }>(`/cashier/lookup/${serial}`),

  cashierStamp: (serial: string, count = 1) =>
    merchantFetch<{ data: any }>('/cashier/stamps', {
      method: 'POST',
      body: JSON.stringify({ serial_number: serial, count }),
    }),

  cashierRemoveStamp: (serial: string, count = 1) =>
    merchantFetch<{ data: any }>('/cashier/stamps/remove', {
      method: 'POST',
      body: JSON.stringify({ serial_number: serial, count }),
    }),

  cashierRedeem: (serial: string, rewardId: number) =>
    merchantFetch<{ data: any }>('/cashier/redemptions', {
      method: 'POST',
      body: JSON.stringify({ serial_number: serial, card_reward_id: rewardId }),
    }),

  // ── Locations ──
  listLocations: () =>
    merchantFetch<{ data: any[] }>('/locations'),

  createLocation: (body: Record<string, any>) =>
    merchantFetch<{ data: any }>('/locations', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateLocation: (id: number | string, body: Record<string, any>) =>
    merchantFetch<{ data: any }>(`/locations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  deleteLocation: (id: number | string) =>
    merchantFetch<{ ok: boolean }>(`/locations/${id}`, { method: 'DELETE' }),
};

// ─── Context ─────────────────────────────────────────────────

type MerchantAuthContextValue = {
  user: MerchantUser | null;
  token: string | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const MerchantAuthContext = createContext<MerchantAuthContextValue | null>(null);

export function MerchantAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MerchantUser | null>(getStoredUser);
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await merchantApi.login(email, password);
      await setStoredToken(res.token, res.user);
      setUser(res.user);
      setTokenState(res.token);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await clearStoredToken();
    setUser(null);
    setTokenState(null);
  }, []);

  const value = useMemo<MerchantAuthContextValue>(
    () => ({
      user,
      token,
      isLoggedIn: user !== null,
      isLoading,
      login,
      logout,
    }),
    [user, token, isLoading, login, logout]
  );

  return (
    <MerchantAuthContext.Provider value={value}>
      {children}
    </MerchantAuthContext.Provider>
  );
}

export function useMerchantAuth(): MerchantAuthContextValue {
  const ctx = useContext(MerchantAuthContext);
  if (!ctx) throw new Error('useMerchantAuth must be used inside MerchantAuthProvider');
  return ctx;
}
