import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import axios from 'axios'

/**
 * Platform (SaaS operator) auth — completely separate from the tenant
 * `useAuth` context. Uses its own token + localStorage key so the two
 * sessions can coexist without stepping on each other.
 */

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8888/api'
const STORAGE_TOKEN = 'stamply.op.token'
const STORAGE_ADMIN = 'stamply.op.admin'

export interface PlatformAdmin {
  id: number
  name: string
  email: string
  role: string
  last_login_at?: string | null
}

export const opApi = axios.create({
  baseURL: API_BASE,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

opApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_TOKEN)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

opApi.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem(STORAGE_TOKEN)
      localStorage.removeItem(STORAGE_ADMIN)
      if (!window.location.pathname.startsWith('/op/login')) {
        window.location.href = '/op/login'
      }
    }
    return Promise.reject(err)
  },
)

interface OpAuthContext {
  admin: PlatformAdmin | null
  token: string | null
  isLoading: boolean
  login: (token: string, admin: PlatformAdmin) => void
  logout: () => void
}

const Ctx = createContext<OpAuthContext | null>(null)

export function OpAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [admin, setAdmin] = useState<PlatformAdmin | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const savedToken = localStorage.getItem(STORAGE_TOKEN)
    const savedAdmin = localStorage.getItem(STORAGE_ADMIN)
    if (savedToken && savedAdmin) {
      setToken(savedToken)
      try {
        setAdmin(JSON.parse(savedAdmin))
      } catch {
        localStorage.removeItem(STORAGE_ADMIN)
      }
    }
    setIsLoading(false)
  }, [])

  const login = (newToken: string, newAdmin: PlatformAdmin) => {
    localStorage.setItem(STORAGE_TOKEN, newToken)
    localStorage.setItem(STORAGE_ADMIN, JSON.stringify(newAdmin))
    setToken(newToken)
    setAdmin(newAdmin)
  }

  const logout = () => {
    localStorage.removeItem(STORAGE_TOKEN)
    localStorage.removeItem(STORAGE_ADMIN)
    setToken(null)
    setAdmin(null)
    window.location.href = '/op/login'
  }

  return (
    <Ctx.Provider value={{ admin, token, isLoading, login, logout }}>
      {children}
    </Ctx.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOpAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useOpAuth must be used inside OpAuthProvider')
  return ctx
}
