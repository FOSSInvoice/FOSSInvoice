import { useEffect, useState, useCallback } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPen } from '@fortawesome/free-solid-svg-icons'
import { useNavigate } from 'react-router-dom'
import { useDatabasePath } from '../context/DatabasePathContext'
import { useSelectedCompany } from '../context/SelectedCompanyContext'
import { DatabaseService } from '../../bindings/github.com/fossinvoice/fossinvoice/internal/services'
import { Company } from '../../bindings/github.com/fossinvoice/fossinvoice/internal/models/models.js'
import CompanyEditorModal from '../components/CompanyEditorModal'

export default function CompanySelector() {
  const navigate = useNavigate()
  const { databasePath, setDatabasePath } = useDatabasePath()
  const { setSelectedCompanyId } = useSelectedCompany()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Company | null>(null)

  useEffect(() => {
    if (!databasePath) return
    let cancelled = false
    setLoading(true)
    setError(null)
  DatabaseService.ListCompanies(databasePath)
      .then((list) => { if (!cancelled) setCompanies(list) })
      .catch((e: any) => { if (!cancelled) setError(e?.message ?? String(e)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [databasePath])

  const openCompany = useCallback((id: number) => {
    setSelectedCompanyId(id)
    navigate(`/company/${id}`)
  }, [navigate, setSelectedCompanyId])

  const closeModal = useCallback(() => {
    setShowModal(false)
    setEditing(null)
  }, [])

  const openEdit = useCallback((c: Company) => {
    setEditing(c)
    setShowModal(true)
  }, [])

  const getIconSrc = useCallback((b64?: string | null) => {
    if (!b64) return null
    const trimmed = b64.trim()
    if (!trimmed) return null
    return `data:image/*;base64,${trimmed}`
  }, [])

  const handleSubmit = useCallback(async (payload: Company) => {
    if (!databasePath) return
    setLoading(true)
    setError(null)
    try {
      if (editing) {
  const updated = await DatabaseService.UpdateCompany(databasePath, payload)
        if (!updated) throw new Error('Failed to update company')
      } else {
  const created = await DatabaseService.CreateCompany(databasePath, payload)
        if (!created) throw new Error('Failed to create company')
      }
  const list = await DatabaseService.ListCompanies(databasePath)
      setCompanies(list)
      setShowModal(false)
      setEditing(null)
    } catch (e: any) {
      setError(e?.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }, [databasePath, editing])

  if (!databasePath) {
    return (
      <div className="min-h-screen grid place-items-center px-4">
        <div className="w-full max-w-lg text-center bg-white dark:bg-neutral-800/70 border border-neutral-200/70 dark:border-neutral-800 rounded-xl shadow-sm p-6">
          <p className="text-neutral-600 dark:text-neutral-300">No database selected.</p>
          <button className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed mt-4" onClick={() => navigate('/')}>Back</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 py-8 app-background" style={{ color: 'var(--color-text-primary)' }}>
      <div className="mx-auto max-w-5xl grid gap-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              className="icon-btn"
              onClick={() => { setDatabasePath(null); setSelectedCompanyId(null); navigate('/'); }}
              aria-label="Back"
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>←</span>
            </button>
            <div>
              <h2 className="text-xl font-semibold heading-primary">Select a Company</h2>
              <p className="text-sm text-muted">Database: <span className="font-mono text-xs">{databasePath}</span></p>
            </div>
          </div>
          {loading && <div className="text-sm text-muted">Loading…</div>}
        </div>
        {error && <div className="text-sm text-red-400">Error: {error}</div>}

        <div className="grid gap-3">
          {companies.length === 0 ? (
            <div className="text-neutral-600 dark:text-neutral-300">No companies yet. Create one below.</div>
          ) : (
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {companies.map((c) => (
                <li key={c.ID} className="p-4 flex items-center justify-between gap-3 card">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{c.Name}</div>
                    <div className="text-xs text-muted mt-1 truncate">ID: {c.ID} {c.TaxID ? `- Tax ID: ${c.TaxID}` : ''}</div>
                    <div className="mt-3 flex gap-2">
                      <button className="btn btn-primary" onClick={() => openCompany(c.ID)}>Open</button>
                      <button
                        className="icon-btn"
                        aria-label="Edit company"
                        title="Edit"
                        onClick={() => openEdit(c)}
                      >
                        <FontAwesomeIcon icon={faPen} />
                      </button>
                    </div>
                  </div>
                  {getIconSrc((c as any).IconB64) ? (
                    <img
                      src={getIconSrc((c as any).IconB64) as string}
                      alt={`${c.Name} logo`}
                      className="w-12 h-12 rounded-md object-cover flex-shrink-0"
                    />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-md grid place-items-center flex-shrink-0"
                      style={{ background: 'var(--color-surface-solid)', color: 'var(--color-text-muted)', border: '1px solid var(--color-surface-border)' }}
                      aria-label="No logo"
                    >
                      <img src="/camera.svg" alt="No logo" className="w-6 h-6 opacity-80" />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Floating action button to open modal */}
        <button className="fab" aria-label="Create company" onClick={() => { setEditing(null); setShowModal(true) }}>+</button>

        <CompanyEditorModal
          open={showModal}
          initial={editing}
          onClose={closeModal}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  )
}
