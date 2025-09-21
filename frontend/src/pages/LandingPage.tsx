import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDatabasePath } from '../context/DatabasePathContext'
import { DialogsService, DatabaseService } from '../../bindings/github.com/fossinvoice/fossinvoice/internal/services'
import { useToast } from '../context/ToastContext'
import { useI18n } from '../i18n'
import LanguageSwitcher from '../components/LanguageSwitcher'

export default function LandingPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { databasePath, setDatabasePath } = useDatabasePath()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const chooseExisting = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
  const res = await DialogsService.SelectFile('', 'SQLite Database', '*.db')
      if (res?.Error) throw new Error(String(res.Error))
      // If user cancelled, res may be null/undefined or Path empty: treat as no-op
      if (!res?.Path) return
      // Ensure DB schema is initialized/migrated
  await DatabaseService.Init(res.Path)
      setDatabasePath(res.Path)
      navigate('/select-company')
    } catch (e: any) {
      const msg = e?.message ?? String(e)
      setError(msg)
      toast.error(msg)
    } finally {
      setBusy(false)
    }
  }, [navigate, setDatabasePath, toast])

  const createNew = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
  const res = await DialogsService.SelectSaveFile('', 'New SQLite Database', '*.db')
      if (res?.Error) throw new Error(String(res.Error))
      // If user cancelled, res may be null/undefined or Path empty: treat as no-op
      if (!res?.Path) return
  await DatabaseService.Init(res.Path)
      setDatabasePath(res.Path)
      navigate('/select-company')
    } catch (e: any) {
      const msg = e?.message ?? String(e)
      setError(msg)
      toast.error(msg)
    } finally {
      setBusy(false)
    }
  }, [navigate, setDatabasePath, toast])

  return (
    <div className="min-h-screen grid place-items-center app-background px-4">
      <div className="w-full max-w-2xl card p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight heading-primary">FossInvoice</h1>
            <p className="text-sm text-muted mt-1">{t('landing.subtitle', 'Select a database file to continue, or create a new one.')}</p>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <img src="/wails.png" alt="FossInvoice" className="size-10 opacity-70" />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button className="btn btn-primary" onClick={chooseExisting} disabled={busy}>
            {t('landing.openExisting', 'Open existing…')}
          </button>
          <button className="btn btn-secondary" onClick={createNew} disabled={busy}>
            {t('landing.createNew', 'Create new…')}
          </button>
        </div>

        {databasePath && (
          <p className="mt-3 text-xs text-muted truncate">{t('landing.selected', 'Selected')}: {databasePath}</p>
        )}
        {error && (
          <p className="mt-3 text-sm text-red-600">{t('common.error')}: {error}</p>
        )}
      </div>
    </div>
  )
}
