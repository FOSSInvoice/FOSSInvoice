import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { ConfigService } from '../../bindings/github.com/fossinvoice/fossinvoice/internal/services'
import en from './locales/en'
import es from './locales/es'
import it from './locales/it'


// Nested message dictionary type: any depth with string leaves
export type Messages = { [key: string]: string | Messages }

const LOCALES: Record<string, Messages> = {
  en,
  es,
  it
}

// Export the list of supported locale codes so UI elements (like a language dropdown)
// can render options dynamically as locales are added.
export const SUPPORTED_LOCALES = Object.keys(LOCALES) as Array<keyof typeof LOCALES>

function detectLocale(): keyof typeof LOCALES {
  const nav = typeof navigator !== 'undefined' ? navigator.language || (navigator as any).userLanguage : 'en'
  const base = (nav || 'en').toLowerCase()
  if (base.startsWith('es')) return 'es'
  if (base.startsWith('it')) return 'it'
  return 'en'
}

type I18nContextValue = {
  locale: keyof typeof LOCALES
  messages: Messages
  t: (path: string, fallback?: string) => string
  setLocale: (loc: keyof typeof LOCALES) => void
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<keyof typeof LOCALES>(detectLocale())

  // Load persisted language from backend config
  useEffect(() => {
    let mounted = true
      ; (async () => {
        try {
          const saved = await ConfigService.GetLanguage()
          if (mounted && saved) {
            const key = saved.slice(0, 2).toLowerCase() == "es" || saved.slice(0, 2).toLowerCase() == "it" ? saved.slice(0, 2).toLowerCase() : 'en'
            setLocaleState(key as keyof typeof LOCALES)
          } else if (mounted) {
            // Persist the detected locale on first run so backend can use it too
            try { void ConfigService.SetLanguage(locale) } catch { }
          }
        } catch {
          // ignore
        }
      })()
    return () => { mounted = false }
  }, [])

  const messages = LOCALES[locale] || en
  const t = useMemo(() => (path: string, fallback?: string) => {
    const parts = path.split('.')
    let node: any = messages
    for (const p of parts) {
      if (node && typeof node === 'object' && p in node) {
        node = node[p]
      } else {
        return fallback ?? path
      }
    }
    return typeof node === 'string' ? node : (fallback ?? path)
  }, [messages])

  const setLocale = (loc: keyof typeof LOCALES) => {
    setLocaleState(loc)
    // Persist to backend (fire and forget)
    try { void ConfigService.SetLanguage(loc) } catch { }
  }

  const value = useMemo(() => ({ locale, messages, t, setLocale }), [locale, messages, t])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}

// Helpers
export function translateStatus(status: string): string {
  // Keep English codes in data, present localized labels in UI
  try {
    const { t } = useI18n()
    return t(`status.${status}`, status)
  } catch {
    // If called outside provider, fallback to passthrough
    const table: Record<string, string> = en.status as any
    return table[status] ?? status
  }
}
