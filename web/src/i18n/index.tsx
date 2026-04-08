import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { ar } from './ar'
import { en } from './en'
import type { Dict } from './types'

type Locale = 'ar' | 'en'

const dicts: Record<Locale, Dict> = { ar, en }

interface I18nContext {
  locale: Locale
  dir: 'rtl' | 'ltr'
  t: (key: keyof Dict) => string
  setLocale: (l: Locale) => void
}

const Ctx = createContext<I18nContext | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem('stamply.locale') as Locale | null
    return saved ?? 'ar'
  })

  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = dir
  }, [locale, dir])

  const setLocale = (l: Locale) => {
    localStorage.setItem('stamply.locale', l)
    setLocaleState(l)
  }

  const t = (key: keyof Dict) => dicts[locale][key] ?? (dicts.en[key] as string) ?? String(key)

  return <Ctx.Provider value={{ locale, dir, t, setLocale }}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider')
  return ctx
}
