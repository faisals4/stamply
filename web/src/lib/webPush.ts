/**
 * Minimal Web Push subscription helpers for the public card PWA.
 *
 * All calls are made from the customer's browser against their own issued
 * card endpoints — no admin tokens, no Sanctum. The flow is:
 *
 *   1. Fetch `/api/public/issued/:serial/push-config` → returns whether
 *      the tenant has push enabled and its VAPID public key.
 *   2. Register `/service-worker.js`.
 *   3. Ask for Notification permission.
 *   4. Call `registration.pushManager.subscribe(...)` with the VAPID key.
 *   5. POST the resulting subscription (endpoint + p256dh + auth) to
 *      `/api/public/issued/:serial/push-token`.
 *
 * Uses `fetch()` directly instead of the axios client because this code
 * runs inside the public page and has no bearer token / interceptors.
 */

const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8888/api') as string

export interface PublicPushConfig {
  enabled: boolean
  vapid_public_key: string | null
}

export async function fetchPublicPushConfig(serial: string): Promise<PublicPushConfig> {
  const res = await fetch(`${API_BASE}/public/issued/${serial}/push-config`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error('tenant push config fetch failed')
  const json = await res.json()
  return json.data as PublicPushConfig
}

/**
 * Convert a base64-URL-encoded VAPID public key to the Uint8Array that
 * PushManager.subscribe expects. Standard boilerplate from the MDN docs.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  // Allocate into a plain ArrayBuffer so the resulting Uint8Array satisfies
  // PushManager.subscribe's `applicationServerKey: BufferSource` type.
  const buffer = new ArrayBuffer(raw.length)
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/**
 * Returns the current browser permission state without mutating anything.
 */
export function currentPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported'
  return Notification.permission
}

/** Register (or re-use) the service worker at `/service-worker.js`. */
async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration('/')
  if (existing) return existing
  return navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
}

/**
 * Returns the current PushSubscription for the given serial's site-wide
 * service worker, or null if not yet subscribed. Useful for restoring the
 * UI state on page reload without prompting the user.
 */
export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null
  try {
    const reg = await getServiceWorkerRegistration()
    return await reg.pushManager.getSubscription()
  } catch {
    return null
  }
}

/**
 * Full subscribe flow. Prompts for permission, creates a subscription,
 * and POSTs it to the backend so the tenant can target the customer.
 * Returns `true` on success, `false` on failure or denial.
 */
export async function subscribeToPush(
  serial: string,
  vapidPublicKey: string,
): Promise<boolean> {
  if (!isPushSupported()) return false

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  const reg = await getServiceWorkerRegistration()

  // Re-use an existing subscription if present; PushManager.subscribe is
  // idempotent per (origin, applicationServerKey) pair.
  let subscription = await reg.pushManager.getSubscription()
  if (!subscription) {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    })
  }

  // The subscription JSON looks like:
  //   {
  //     endpoint: 'https://fcm.googleapis.com/...',
  //     keys: { p256dh: '...', auth: '...' }
  //   }
  const json = subscription.toJSON() as {
    endpoint?: string
    keys?: { p256dh?: string; auth?: string }
  }
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return false
  }

  const res = await fetch(`${API_BASE}/public/issued/${serial}/push-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      platform: 'web',
      token: json.endpoint,
      device_info: {
        keys: json.keys,
        userAgent: navigator.userAgent,
        language: navigator.language,
      },
    }),
  })
  return res.ok
}

