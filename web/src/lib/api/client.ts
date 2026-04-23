import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8888/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
})

/**
 * Returns the active auth token. In embed mode (mobile app iframe)
 * we read the merchant token directly so we never touch the
 * customer's `stamply.token` key.
 */
function getActiveToken(): string | null {
  const isEmbed = sessionStorage.getItem('stamply.embed') === '1'
  if (isEmbed) {
    return localStorage.getItem('stamply.merchant.token')
  }
  return localStorage.getItem('stamply.token')
}

// Attach bearer token from localStorage if present
api.interceptors.request.use((config) => {
  const token = getActiveToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/**
 * Routes that must NEVER trigger an auto-redirect to /admin/login on
 * a 401 response. These are pages where the user is expected to be
 * unauthenticated — public customer-facing pages, the marketing
 * landing, and the login/signup pages themselves.
 *
 * The 401 still clears the stale token (so the next admin visit
 * starts fresh), but the page itself stays where it is.
 */
function isPublicPath(path: string): boolean {
  return (
    path === '/' ||
    path.startsWith('/admin/login') ||
    path.startsWith('/op/login') ||
    path.startsWith('/signup') ||
    path.startsWith('/c/') ||
    path.startsWith('/i/')
  )
}

// On 401, clear token and redirect to login — but only when the user
// is on a protected page. In embed mode, never redirect or clear the
// customer token since we're reading from stamply.merchant.token.
api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      const isEmbed = sessionStorage.getItem('stamply.embed') === '1'
      if (!isEmbed) {
        localStorage.removeItem('stamply.token')
        const path = window.location.pathname
        if (!isPublicPath(path)) {
          window.location.href = '/admin/login'
        }
      }
    }

    // ── خط الدفاع الثاني للاشتراكات وحدود الباقة ──────────────
    // الخط الأول: useSubscriptionGuard يعطّل الأزرار في الفرونتند
    // الخط الثاني (هنا): لو وصل الطلب للباكند رغم ذلك، نعرض الرسالة
    // يلتقط 403 من:
    //   • CheckSubscription middleware  → error: "subscription_expired"
    //   • CheckPlanQuota middleware     → error: "plan_quota_exceeded"
    if (error.response?.status === 403) {
      const errType = error.response?.data?.error
      if (errType === 'subscription_expired' || errType === 'plan_quota_exceeded') {
        const msg = error.response.data.message
        if (msg) alert(msg)
      }
    }

    return Promise.reject(error)
  },
)
