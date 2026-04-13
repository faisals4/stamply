import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '../api/client'

export interface SubscriptionExpiredData {
  plan: string
  expired_at: string | null
  is_trial: boolean
  message: string
  trial_started_at?: string
  trial_days_total?: number
  trial_days_used?: number
  subscription_starts_at?: string
}

export interface User {
  id: number
  name: string
  email: string
  tenant_id: number
  role?: string
  /** Allowed permission keys, returned by /api/login and /api/me. */
  permissions?: string[]
  /** Present when the tenant's subscription/trial has expired. */
  subscription_expired_data?: SubscriptionExpiredData
}

interface AuthContext {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (token: string, user: User) => void
  logout: () => void
  /** True when the current user is allowed to perform `permission`. Admin always passes. */
  can: (permission: string) => boolean
}

const Ctx = createContext<AuthContext | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // In embed mode (mobile app iframe), read merchant credentials
    // directly so we never touch the customer's stamply.token.
    const isEmbed = sessionStorage.getItem('stamply.embed') === '1'
    const tokenKey = isEmbed ? 'stamply.merchant.token' : 'stamply.token'
    const userKey = isEmbed ? 'stamply.merchant.user' : 'stamply.user'

    const savedToken = localStorage.getItem(tokenKey)
    const savedUser = localStorage.getItem(userKey)
    if (savedToken && savedUser) {
      setToken(savedToken)
      try {
        setUser(JSON.parse(savedUser))
      } catch {
        localStorage.removeItem(userKey)
      }

      // Refresh user (especially permissions) from the server in the
      // background so the cashier sees role changes immediately on next load.
      api
        .get('/me')
        .then((res) => {
          const fresh = res.data as User
          setUser(fresh)
          localStorage.setItem(userKey, JSON.stringify(fresh))
        })
        .catch(() => {
          // 401 → handled by axios interceptor → already redirects to login
        })
    }
    setIsLoading(false)
  }, [])

  const login = (newToken: string, newUser: User) => {
    const isEmbed = sessionStorage.getItem('stamply.embed') === '1'

    // Always write to the merchant-specific key.
    localStorage.setItem('stamply.merchant.token', newToken)
    localStorage.setItem('stamply.merchant.user', JSON.stringify(newUser))

    if (isEmbed) {
      // Embedded in mobile app — do NOT touch stamply.token (customer's key).
    } else {
      // Direct dashboard access — save the customer token before
      // overwriting so it can be restored on logout.
      const existingCustomerToken = localStorage.getItem('stamply.token')
      const existingCustomerUser = localStorage.getItem('stamply.customer')
      if (existingCustomerToken) {
        localStorage.setItem('stamply._saved_customer_token', existingCustomerToken)
      }
      if (existingCustomerUser) {
        localStorage.setItem('stamply._saved_customer_user', existingCustomerUser)
      }
      localStorage.setItem('stamply.token', newToken)
      localStorage.setItem('stamply.user', JSON.stringify(newUser))
    }

    setToken(newToken)
    setUser(newUser)
  }

  const logout = () => {
    const isEmbed = sessionStorage.getItem('stamply.embed') === '1'

    localStorage.removeItem('stamply.merchant.token')
    localStorage.removeItem('stamply.merchant.user')

    if (!isEmbed) {
      // Restore the customer token if we saved one during login.
      const savedToken = localStorage.getItem('stamply._saved_customer_token')
      const savedUser = localStorage.getItem('stamply._saved_customer_user')
      if (savedToken) {
        localStorage.setItem('stamply.token', savedToken)
        localStorage.removeItem('stamply._saved_customer_token')
      } else {
        localStorage.removeItem('stamply.token')
      }
      if (savedUser) {
        localStorage.setItem('stamply.customer', savedUser)
        localStorage.removeItem('stamply._saved_customer_user')
      }
      localStorage.removeItem('stamply.user')
    }

    setToken(null)
    setUser(null)
    if (!isEmbed) window.location.href = '/admin/login'
  }

  const can = useCallback(
    (permission: string): boolean => {
      if (!user) return false
      if (user.role === 'admin') return true
      return (user.permissions ?? []).includes(permission)
    },
    [user],
  )

  return (
    <Ctx.Provider value={{ user, token, isLoading, login, logout, can }}>
      {children}
    </Ctx.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
