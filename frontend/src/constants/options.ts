// Shared option lists and helpers for select controls

// Common ISO 4217 currency codes shown by default
export const COMMON_CURRENCIES = [
  'EUR', 'USD', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SEK', 'NZD',
] as const

// Allowed invoice statuses
export const ALLOWED_STATUSES = [
  'Draft', 'Pending', 'Sent', 'Paid', 'Void',
] as const

// Ensures the current value appears in the options list (without duplication)
export function withCurrentFirst<T extends string>(options: readonly T[], current?: string | null): string[] {
  if (!current || !current.trim()) return [...options]
  const cur = current.trim()
  return options.includes(cur as T) ? [...options] : [cur, ...options]
}
