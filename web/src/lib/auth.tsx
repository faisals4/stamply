import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from './api'

export interface User {
  id: number
  name: string
  email: string
  tenant_id: number
  role?: string
  /** Allowed permission keys, returned by /api/login and /api/me. */
  permissions?: string[]
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
    const savedToken = localStorage.getItem('stamply.token')
    const savedUser = localStorage.getItem('stamply.user')
    if (savedToken && savedUser) {
      setToken(savedToken)
      try {
        setUser(JSON.parse(savedUser))
      } catch {
        localStorage.removeItem('stamply.user')
      }

      // Refresh user (especially permissions) from the server in the
      // background so the cashier sees role changes immediately on next load.
      api
        .get('/me')
        .then((res) => {
          const fresh = res.data as User
          setUser(fresh)
          localStorage.setItem('stamply.user', JSON.stringify(fresh))
        })
        .catch(() => {
          // 401 → handled by axios interceptor → already redirects to login
        })
    }
    setIsLoading(false)
  }, [])

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('stamply.token', newToken)
    localStorage.setItem('stamply.user', JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
  }

  const logout = () => {
    localStorage.removeItem('stamply.token')
    localStorage.removeItem('stamply.user')
    setToken(null)
    setUser(null)
    window.location.href = '/admin/login'
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
