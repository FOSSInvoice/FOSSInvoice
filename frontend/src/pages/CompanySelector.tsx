import { useEffect, useMemo, useState, useCallback, ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDatabasePath } from '../context/DatabasePathContext'
import { useSelectedCompany } from '../context/SelectedCompanyContext'
import { ListCompanies, CreateCompany, UpdateCompany } from '../../bindings/github.com/fossinvoice/fossinvoice/internal/services/databaseservice.js'
import { Company } from '../../bindings/github.com/fossinvoice/fossinvoice/internal/models/models.js'

export default function CompanySelector() {
  const navigate = useNavigate()
  const { databasePath, setDatabasePath } = useDatabasePath()
  const { setSelectedCompanyId } = useSelectedCompany()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])

  const [name, setName] = useState('')
  const [taxID, setTaxID] = useState('')
  const [address, setAddress] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Company | null>(null)
  const [iconB64, setIconB64] = useState('')

  const canCreate = useMemo(() => name.trim().length > 0, [name])

  useEffect(() => {
    if (!databasePath) return
    let cancelled = false
    setLoading(true)
    setError(null)
    ListCompanies(databasePath)
      .then((list) => { if (!cancelled) setCompanies(list) })
      .catch((e: any) => { if (!cancelled) setError(e?.message ?? String(e)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [databasePath])

  const openCompany = useCallback((id: number) => {
    setSelectedCompanyId(id)
    navigate(`/company/${id}`)
  }, [navigate, setSelectedCompanyId])

  const clearForm = useCallback(() => {
    setName('')
    setTaxID('')
    setAddress('')
    setIconB64('')
  }, [])

  const closeModal = useCallback(() => {
    setShowModal(false)
    setEditing(null)
    clearForm()
  }, [clearForm])

  const getIconSrc = useCallback((b64?: string | null) => {
    if (!b64) return null
    const trimmed = b64.trim()
    if (!trimmed) return null
    return `data:image/*;base64,${trimmed}`
  }, [])

  const onIconFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const comma = result.indexOf(',')
      const b64 = comma >= 0 ? result.slice(comma + 1) : result
      setIconB64(b64)
    }
    reader.readAsDataURL(file)
  }, [])

  const create = useCallback(async () => {
    if (!databasePath) return
    if (!canCreate) return
    setLoading(true)
    setError(null)
    try {
      const payload = new Company({ Name: name.trim(), Address: address.trim(), TaxID: taxID.trim(), IconB64: iconB64.trim() })
      const created = await CreateCompany(databasePath, payload)
      if (!created) throw new Error('Failed to create company')
      // Refresh list; do not auto-open
      const list = await ListCompanies(databasePath)
      setCompanies(list)
      clearForm()
      setShowModal(false)
    } catch (e: any) {
      setError(e?.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }, [address, canCreate, clearForm, databasePath, iconB64, name, taxID])

  const openEdit = useCallback((c: Company) => {
    setEditing(c)
    setName(c.Name ?? '')
    setTaxID(c.TaxID ?? '')
    setAddress(c.Address ?? '')
    setIconB64((c as any).IconB64 ?? '')
    setShowModal(true)
  }, [])

  const saveEdit = useCallback(async () => {
    if (!databasePath || !editing) return
    setLoading(true)
    setError(null)
    try {
      const payload = new Company({
        ID: editing.ID,
        Name: name.trim(),
        Address: address.trim(),
        TaxID: taxID.trim(),
        IconB64: iconB64.trim(),
      })
      const updated = await UpdateCompany(databasePath, payload)
      if (!updated) throw new Error('Failed to update company')
      const list = await ListCompanies(databasePath)
      setCompanies(list)
      setShowModal(false)
      setEditing(null)
      clearForm()
    } catch (e: any) {
      setError(e?.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }, [address, clearForm, databasePath, editing, iconB64, name, taxID])

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
                      <button className="btn btn-secondary" onClick={() => openEdit(c)}>Edit</button>
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
        <button className="fab" aria-label="Create company" onClick={() => { setEditing(null); clearForm(); setShowModal(true) }}>+</button>

        {/* Modal for creating a new company */}
        {showModal && (
          <div className="modal-overlay" role="dialog" aria-modal="true" onClick={closeModal}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-medium heading-primary">{editing ? 'Edit company' : 'Create a new company'}</h3>
              <div className="grid gap-3 mt-3">
                <input className="input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
                <input className="input" placeholder="Tax ID" value={taxID} onChange={(e) => setTaxID(e.target.value)} />
                <input className="input" placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
                <div className="grid gap-2">
                  <label className="text-sm text-muted">Icon (optional)</label>
                  <div className="flex items-center gap-3">
                    {getIconSrc(iconB64) ? (
                      <img src={getIconSrc(iconB64) as string} alt="Preview" className="w-12 h-12 rounded-md object-cover" />
                    ) : (
                      <div
                        className="w-12 h-12 rounded-md grid place-items-center"
                        style={{ background: 'var(--color-surface-solid)', color: 'var(--color-text-muted)', border: '1px solid var(--color-surface-border)' }}
                      >
                        <img src="/camera.svg" alt="No logo" className="w-6 h-6 opacity-80" />
                      </div>
                    )}
                    <input type="file" accept="image/*" className="input" onChange={onIconFileChange} />
                    {iconB64 && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-compact"
                        onClick={() => setIconB64('')}
                        aria-label="Remove company icon"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-actions mt-4">
                <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                {editing ? (
                  <button className="btn btn-primary" onClick={saveEdit} disabled={loading}>Save</button>
                ) : (
                  <button className="btn btn-primary" onClick={create} disabled={!canCreate || loading}>Create</button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
