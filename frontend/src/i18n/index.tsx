import React, { createContext, useContext, useMemo } from 'react'
import en from './locales/en'
import es from './locales/es'

// Nested message dictionary type: any depth with string leaves
export type Messages = { [key: string]: string | Messages }

const LOCALES: Record<string, Messages> = {
  en,
  es,
}

function detectLocale(): keyof typeof LOCALES {
  const nav = typeof navigator !== 'undefined' ? navigator.language || (navigator as any).userLanguage : 'en'
  const base = (nav || 'en').toLowerCase()
  if (base.startsWith('es')) return 'es'
  return 'en'
}

type I18nContextValue = {
  locale: keyof typeof LOCALES
  messages: Messages
  t: (path: string, fallback?: string) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const locale = detectLocale()
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

  const value = useMemo(() => ({ locale, messages, t }), [locale, messages, t])
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
