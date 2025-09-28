import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { ConfigService } from '../../bindings/github.com/fossinvoice/fossinvoice/internal/services'

// Nested message dictionary type: any depth with string leaves
export type Messages = { [key: string]: string | Messages }

// We keep a list of supported locales here (mirrors public/locales/*.json)
export const SUPPORTED_LOCALES = ['en', 'es', 'it'] as const
export const LOCALE_LABELS: Record<string, string> = {
  en: 'English',
  es: 'Español',
  it: 'Italiano',
} as const

export type LocaleCode = typeof SUPPORTED_LOCALES[number]

function detectLocale(): LocaleCode {
  const nav = typeof navigator !== 'undefined' ? (navigator.language || (navigator as any).userLanguage) : ''
  const candidate = (nav || '').slice(0, 2).toLowerCase()
  const fallback = SUPPORTED_LOCALES[0]
  return (SUPPORTED_LOCALES as readonly string[]).includes(candidate) ? candidate as LocaleCode : fallback
}

type I18nContextValue = {
  locale: LocaleCode
  messages: Messages
  t: (path: string, fallback?: string) => string
  setLocale: (loc: LocaleCode) => void
  loading: boolean
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(detectLocale())
  const [messages, setMessages] = useState<Messages>({})
  const [loading, setLoading] = useState(true)

  // Helper to actually fetch a locale JSON
  async function loadLocaleJSON(code: LocaleCode) {
    setLoading(true)
    try {
      const res = await fetch(`${import.meta.env.BASE_URL || '/'}locales/${code}.json`, { cache: 'no-cache' })
      if (!res.ok) throw new Error('Failed to load locale ' + code)
      const data = await res.json() as Messages
      setMessages(data)
    } catch (e) {
      // Fallback: attempt English if not already
      if (code !== 'en') {
        try {
          const r2 = await fetch(`${import.meta.env.BASE_URL || '/'}locales/en.json`, { cache: 'no-cache' })
          if (r2.ok) {
            setMessages(await r2.json())
          }
        } catch { /* ignore */ }
      }
    } finally {
      setLoading(false)
    }
  }

  // Initial: try backend saved language, else detected
  useEffect(() => {
    let cancelled = false
    ; (async () => {
      let initial = detectLocale()
      try {
        const saved = await ConfigService.GetLanguage()
        if (saved) {
          const key = saved.slice(0, 2).toLowerCase() as LocaleCode
          if (SUPPORTED_LOCALES.includes(key)) initial = key
        } else {
          // Persist the detected locale on first run
          try { void ConfigService.SetLanguage(initial) } catch { }
        }
      } catch { /* ignore */ }
      if (!cancelled) {
        setLocaleState(initial)
        await loadLocaleJSON(initial)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Re-load when locale changes (user initiated)
  useEffect(() => {
    loadLocaleJSON(locale)
  }, [locale])

  const t = useMemo(() => (path: string, fallback?: string) => {
    const parts = path.split('.')
    let node: any = messages
    for (const p of parts) {
      if (node && typeof node === 'object' && p in node) {
        node = (node as any)[p]
      } else {
        return fallback ?? path
      }
    }
    return typeof node === 'string' ? node : (fallback ?? path)
  }, [messages])

  const setLocale = (loc: LocaleCode) => {
    if (loc === locale) return
    setLocaleState(loc)
    try { void ConfigService.SetLanguage(loc) } catch { }
  }

  const value = useMemo(() => ({ locale, messages, t, setLocale, loading }), [locale, messages, t, loading])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}

// Helpers
export function translateStatus(status: string): string {
  try {
    const { t } = useI18n()
    return t(`status.${status}`, status)
  } catch {
    return status
  }
}
