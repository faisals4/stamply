import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
})

// Attach bearer token from localStorage if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('stamply.token')
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
// is on a protected page. Public pages stay put.
api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('stamply.token')
      const path = window.location.pathname
      if (!isPublicPath(path)) {
        window.location.href = '/admin/login'
      }
    }
    return Promise.reject(error)
  },
)
