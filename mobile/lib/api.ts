import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getToken, clearAuth } from './auth';

/**
 * Minimal typed fetch wrapper around the Stamply /api/app/* endpoints.
 *
 * Base URL resolution:
 *
 *   - **Web**: same origin as the page. The production build is served
 *     by Laravel under `/app`, so hitting `/api/...` reaches the same
 *     Laravel instance with no CORS boundary. This is the reason we
 *     deploy under a subpath instead of a separate host.
 *   - **iOS / Android**: reads `expo.extra.apiUrl` from app.json, or
 *     `EXPO_PUBLIC_API_URL` at build time. Point this at the dev
 *     machine's LAN IP so Expo Go on a physical phone can reach it.
 *
 * On 401 the cached token is cleared so the auth gate bounces back
 * to /login on the next render.
 */

function resolveApiUrl(): string {
  // Web: same origin, no CORS. Fallback to absolute URL during SSR /
  // pre-render where `window` doesn't exist.
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/api`;
    }
    return '/api';
  }

  // Native: config-driven.
  const fromEnv = (process.env as any).EXPO_PUBLIC_API_URL;
  const fromConfig = (Constants.expoConfig?.extra as any)?.apiUrl;
  return fromEnv || fromConfig || 'http://127.0.0.1:8000/api';
}

export const API_URL: string = resolveApiUrl();

export class ApiError extends Error {
  status: number;
  code?: string;
  body?: any;

  constructor(message: string, status: number, code?: string, body?: any) {
    super(message);
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

type RequestOpts = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  auth?: boolean;
};

async function request<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  const needsAuth = opts.auth !== false;
  if (needsAuth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  } catch (e: any) {
    throw new ApiError(
      'network_error: ' + (e?.message ?? 'unknown'),
      0,
      'network_error',
    );
  }

  // 401 — token expired/revoked. Clear and redirect to login.
  if (res.status === 401) {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (!(window as any).__stamply_redirecting) {
        (window as any).__stamply_redirecting = true;
        await clearAuth();
        window.location.href = '/app/';
      }
    } else {
      await clearAuth();
    }
    throw new ApiError('Unauthorized', 401, 'auth_error');
  }

  let body: any = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    throw new ApiError(
      body?.message ?? `HTTP ${res.status}`,
      res.status,
      body?.error,
      body,
    );
  }

  return body as T;
}

/* ─── Auth ────────────────────────────────────────────────────── */

export type OtpRequestResponse = {
  data: {
    sent: true;
    expires_in: number;
    phone_masked: string;
    debug_code: string | null;
  };
};

export type Gender = 'male' | 'female';

/**
 * Field names the customer can lock from merchant edits. When a field
 * is in `locked_fields`, any tenant-level attempt to change it on a
 * customer row gets 423 Locked from the merchant API.
 */
export type LockableField =
  | 'first_name'
  | 'last_name'
  | 'email'
  | 'birthdate'
  | 'gender';

export type CustomerPayload = {
  id: number;
  phone: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  birthdate: string | null; // ISO date (YYYY-MM-DD)
  gender: Gender | null;
  locale: 'ar' | 'en' | null;
  phone_verified_at: string | null;
  locked_fields: LockableField[];
};

export type OtpVerifyResponse = {
  data: { token: string; customer: CustomerPayload };
};

export const api = {
  otpRequest(phone: string) {
    return request<OtpRequestResponse>('/app/auth/otp/request', {
      method: 'POST',
      body: { phone },
      auth: false,
    });
  },

  otpVerify(phone: string, code: string) {
    return request<OtpVerifyResponse>('/app/auth/otp/verify', {
      method: 'POST',
      body: { phone, code },
      auth: false,
    });
  },

  logout() {
    return request<{ ok: true }>('/app/auth/logout', { method: 'POST' });
  },

  /* ─── Profile ────────────────────────────────── */
  me() {
    return request<{ data: CustomerPayload & { tenants_count: number } }>(
      '/app/me',
    );
  },

  /**
   * Update the customer profile. Any field sent with a non-empty
   * value will be saved AND added to `locked_fields` so merchants
   * can't override it later. Send `null` to clear + unlock a field.
   */
  updateMe(
    patch: Partial<
      Pick<
        CustomerPayload,
        'first_name' | 'last_name' | 'email' | 'birthdate' | 'gender' | 'locale'
      >
    >,
  ) {
    return request<{ data: CustomerPayload & { tenants_count: number } }>(
      '/app/me',
      { method: 'PUT', body: patch },
    );
  },

  /* ─── Cards ──────────────────────────────────── */
  cards() {
    return request<{ data: CardsGroup[] }>('/app/cards');
  },

  cardDetail(serial: string) {
    return request<{ data: CardDetail }>(`/app/cards/${encodeURIComponent(serial)}`);
  },

  /** All card templates for a tenant + subscribed flag per template. */
  tenantCards(tenantId: number) {
    return request<{ data: TenantCardsResponse }>(`/app/tenant/${tenantId}/cards`);
  },

  /** Subscribe to a card template using the customer's profile data. */
  subscribeToCard(templateId: number, profile: { phone: string; first_name?: string | null; last_name?: string | null; email?: string | null; birthdate?: string | null }) {
    return request<{ data: any }>(`/public/cards/${templateId}/issue`, {
      method: 'POST',
      body: {
        phone: profile.phone,
        first_name: profile.first_name ?? undefined,
        last_name: profile.last_name ?? undefined,
        email: profile.email ?? undefined,
        birthdate: profile.birthdate ?? undefined,
        source_utm: 'stamply-app',
      },
      auth: false,
    });
  },

  /** Paginated tenants with active cards — sorted by nearest when lat/lng provided. */
  discoverTenants(page = 1, loc?: { lat: number; lng: number } | null) {
    const params = new URLSearchParams({ page: String(page), per_page: '20' });
    if (loc) {
      params.set('lat', String(loc.lat));
      params.set('lng', String(loc.lng));
    }
    return request<{
      data: { id: number; name: string; description?: string | null; logo_url: string | null; active_cards_count: number; nearest_km?: number; locations?: { id: number; name: string; lat: number; lng: number }[] }[];
      favorite_ids: number[];
      meta: { current_page: number; last_page: number; per_page: number; total: number };
    }>(`/app/discover/tenants?${params.toString()}`);
  },

  /* ─── Favorites ─────────────────────────────── */
  favorites(page = 1) {
    return request<{
      data: { id: number; name: string; description?: string | null; logo_url: string | null; active_cards_count: number }[];
      meta: { current_page: number; last_page: number; per_page: number; total: number };
    }>(`/app/favorites?page=${page}&per_page=20`);
  },
  addFavorite(tenantId: number) {
    return request<{ ok: boolean }>(`/app/favorites/${tenantId}`, { method: 'POST' });
  },
  removeFavorite(tenantId: number) {
    return request<{ ok: boolean }>(`/app/favorites/${tenantId}`, { method: 'DELETE' });
  },

  walletApple(serial: string) {
    return request<{ data: { url: string } }>(
      `/app/cards/${encodeURIComponent(serial)}/wallet/apple`,
      { method: 'POST' },
    );
  },

  walletGoogle(serial: string) {
    return request<{ data: { url: string } }>(
      `/app/cards/${encodeURIComponent(serial)}/wallet/google`,
      { method: 'POST' },
    );
  },

  /** Cards the customer has hidden from the home screen. */
  archivedCards() {
    return request<{ data: { tenant: Tenant | null; cards: CardFull[] }[] }>(
      '/app/cards/archived',
    );
  },

  /** Hide a card from the home screen (archive). */
  archiveCard(serial: string) {
    return request<{ message: string }>(
      `/app/cards/${encodeURIComponent(serial)}/archive`,
      { method: 'POST' },
    );
  },

  /** Restore a previously archived card back to the home screen. */
  unarchiveCard(serial: string) {
    return request<{ message: string }>(
      `/app/cards/${encodeURIComponent(serial)}/unarchive`,
      { method: 'POST' },
    );
  },

  /**
   * Register (or refresh) this device's FCM push token with the backend
   * so CardNotificationDispatcher / BroadcastNotifier can reach it.
   *
   * Called on every cold start from lib/push.ts after we have a fresh
   * token from messaging().getToken() — FCM may rotate the token at
   * any time, so the backend expects us to re-send on each launch.
   */
  registerDevice(input: {
    token: string;
    platform: 'ios' | 'android';
    device_info?: Record<string, unknown>;
  }) {
    return request<{ data: { id: number; platform: string; registered_at: string } }>(
      `/app/devices`,
      { method: 'POST', body: input },
    );
  },

  /**
   * Unregister this device's token on explicit logout so the user
   * stops receiving notifications.
   */
  unregisterDevice(token: string) {
    return request<{ data: { ok: boolean } }>(`/app/devices`, {
      method: 'DELETE',
      body: { token },
    });
  },

  /**
   * Paginated activity timeline (stamps + redemptions) for a single
   * card. Used by the details sheet's "show more" flow.
   */
  cardActivity(serial: string, page: number, perPage = 10) {
    const qs = `?page=${page}&per_page=${perPage}`;
    return request<{
      data: CardActivityEntry[];
      meta: { page: number; per_page: number; total: number; has_more: boolean };
    }>(`/app/cards/${encodeURIComponent(serial)}/activity${qs}`);
  },
};

/* ─── Types ─────────────────────────────────────────────────── */

export type Tenant = {
  id: number;
  name: string;
  logo_url: string;
  brand_color: string | null;
};

/**
 * Card design JSON — matches the `card_templates.design` column and the
 * web-side `CardDesign` type in `web/src/types/card.ts`. The mobile
 * `CardVisual` reads colours, icons, labels, and stamp count from here.
 */
export type CardDesign = {
  stampsCount: number;
  activeStampIcon: string;
  inactiveStampIcon: string;
  colors: {
    background: string;
    foreground: string;
    stampsBackground: string;
    activeStamp: string;
    inactiveStamp: string;
  };
  logoUrl?: string;
  backgroundUrl?: string;
  labels?: {
    title?: string;
    stamps?: string;
    reward?: string;
    customer?: string;
  };
};

export type CardReward = {
  id: number;
  name: string;
  stamps_required: number;
  image_url: string | null;
  achieved: boolean;
};

/**
 * One entry in the card activity timeline. Matches the backend
 * payload shape from `GET /api/app/cards/{serial}/activity`: either
 * a stamp event or a redemption event, discriminated by `type`.
 */
export type CardActivityEntry =
  | {
      type: 'stamp';
      id: number;
      created_at: string | null;
      count: number;
      reason: string | null;
    }
  | {
      type: 'redemption';
      id: number;
      created_at: string | null;
      reward_name: string | null;
    };

export type CardSummary = {
  serial: string;
  name: string | null;
  description: string | null;
  stamps_count: number;
  stamps_required: number | null;
  next_reward: {
    name: string;
    stamps_required: number;
    image_url: string | null;
  } | null;
  status: string;
  issued_at: string | null;
  last_used_at: string | null;
  design: CardDesign | null;
  all_rewards?: CardReward[];
};

/**
 * Fully-hydrated card payload returned by the index endpoint — the
 * mobile cards screen renders every card as a self-contained visual
 * with its own wallet button + stamp history, so the list endpoint
 * sends everything upfront to avoid a detail fetch per card.
 */
export type CardFull = CardSummary & {
  all_rewards: CardReward[];
  customer_name: string | null;
  stamps_history: Array<{ id: number; created_at: string | null }>;
  redemptions_history: Array<{
    id: number;
    reward_name: string | null;
    created_at: string | null;
  }>;
};

export type CardsGroup = {
  tenant: Tenant | null;
  cards: CardFull[];
};

export type CardDetail = {
  card: CardSummary & {
    all_rewards: Array<{
      id: number;
      name: string;
      stamps_required: number;
      image_url: string | null;
      achieved: boolean;
    }>;
  };
  tenant: Tenant | null;
  customer: { name: string | null; phone: string | null };
  stamps: Array<{ id: number; created_at: string | null }>;
  redemptions: Array<{ id: number; reward_name: string | null; created_at: string | null }>;
};

/** Response from GET /api/app/tenant/{id}/cards */
export type TenantCardTemplate = {
  template_id: number;
  name: string;
  description: string | null;
  design: CardDesign | null;
  stamps_required: number | null;
  reward_name: string | null;
  subscribed: boolean;
  issued_serial: string | null;
  stamps_count: number;
};

export type TenantLocation = {
  id: number;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
};

export type TenantCardsResponse = {
  tenant: Tenant | null;
  locations: TenantLocation[];
  cards: TenantCardTemplate[];
};
