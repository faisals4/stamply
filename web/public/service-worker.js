/* Stamply Web Push service worker.
 *
 * Registered from /i/:serial when the customer enables notifications.
 * Handles two events:
 *
 *   - `push`: show a notification built from the JSON payload the backend
 *     sent via web-push (see PushService::dispatchWebPush).
 *   - `notificationclick`: focus or open the target URL (customer's card).
 *
 * This file is served from the site root so its scope covers `/i/*` and
 * `/c/*`. It's intentionally tiny — no caching, no offline fallback, just
 * push.
 */

self.addEventListener('install', () => {
  // Activate this SW immediately on first install instead of waiting for
  // all open tabs to close. Speeds up iteration during development.
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  // Take control of any already-open clients so they start receiving
  // push events through THIS version of the worker right away.
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  // Log so the user can see "push received" in Application → Service
  // Workers → Console while diagnosing delivery issues.
  console.log('[stamply-sw] push event received', {
    hasData: !!event.data,
  })

  let payload
  if (event.data) {
    try {
      payload = event.data.json()
    } catch {
      payload = { title: 'Stamply', body: event.data.text() }
    }
  } else {
    // A push WITHOUT a payload is still a valid Web Push — DevTools'
    // "Push" test button sends one. Fall back to a generic banner so the
    // user sees confirmation that the service worker is alive.
    payload = { title: 'Stamply', body: 'تنبيه اختباري بدون بيانات' }
  }

  const title = payload.title || 'Stamply'
  const options = {
    body: payload.body || '',
    icon: '/favicon.png',
    badge: '/favicon.png',
    data: {
      url: payload.url || '/',
      tenant_id: payload.tenant_id,
    },
    tag: `stamply-${payload.tenant_id || 'default'}`,
    renotify: true,
  }

  event.waitUntil(
    self.registration
      .showNotification(title, options)
      .then(() => console.log('[stamply-sw] showNotification ok'))
      .catch((e) => console.error('[stamply-sw] showNotification failed', e)),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'

  console.log('[stamply-sw] notificationclick', { url })

  event.waitUntil(
    (async () => {
      try {
        const windowClients = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        })

        // 1. If a tab already has this exact URL open, just focus it.
        for (const client of windowClients) {
          if (client.url === url && 'focus' in client) {
            console.log('[stamply-sw] focusing existing tab')
            return client.focus()
          }
        }

        // 2. Otherwise open a fresh tab. `openWindow` handles both the
        //    "Chrome in background" and "Chrome not open" cases and takes
        //    care of focusing for us — this is the single most reliable
        //    navigation primitive from a service worker.
        console.log('[stamply-sw] opening new tab:', url)
        const opened = await self.clients.openWindow(url)
        if (opened) return opened.focus()
      } catch (e) {
        console.error('[stamply-sw] notificationclick failed', e)
      }
    })(),
  )
})
