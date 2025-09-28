import { LOCALE_LABELS, SUPPORTED_LOCALES, useI18n } from '../i18n'

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n()

  return (
    <label className="inline-flex items-center gap-2 text-xs" title={t('common.language', 'Language')}>
      <span className="text-muted hidden sm:inline">{t('common.language', 'Language')}</span>
      <select
        className="input py-1 px-2 text-xs"
        value={locale}
        onChange={(e) => setLocale(e.target.value as (typeof SUPPORTED_LOCALES)[number])}
        aria-label={t('common.language', 'Language')}
      >
        {SUPPORTED_LOCALES.map((code) => (
          <option key={code} value={code}>
            {LOCALE_LABELS[code] ?? code.toUpperCase()}
          </option>
        ))}
      </select>
    </label>
  )
}
