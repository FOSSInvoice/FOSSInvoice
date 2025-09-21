import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useSelectedCompany } from '../../context/SelectedCompanyContext'
import { useDatabasePath } from '../../context/DatabasePathContext'
import { ListCompanies, UpdateCompany, GetCompanyDefaults, UpdateCompanyDefaults } from '../../../bindings/github.com/fossinvoice/fossinvoice/internal/services/databaseservice.js'
import { Company } from '../../../bindings/github.com/fossinvoice/fossinvoice/internal/models/models.js'
import CompanyDefaultsModal from '../../components/CompanyDefaultsModal'
import CompanyEditorModal from '../../components/CompanyEditorModal'

export default function CompanyInfo() {
  const { companyId } = useParams()
  const { selectedCompanyId } = useSelectedCompany()
  const { databasePath } = useDatabasePath()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showDefaults, setShowDefaults] = useState(false)
  const [defaultsLoading, setDefaultsLoading] = useState(false)
  const [defaults, setDefaults] = useState<{ DefaultCurrency: string; DefaultTaxRate: number } | null>(null)

  const effectiveId = useMemo(() => {
    const fromRoute = companyId ? Number(companyId) : null
    return !Number.isNaN(fromRoute as number) && fromRoute ? fromRoute : selectedCompanyId
  }, [companyId, selectedCompanyId])

  const loadCompany = useCallback(async () => {
    if (!databasePath || !effectiveId) return
    setLoading(true)
    setError(null)
    try {
      const list = await ListCompanies(databasePath)
      const found = list.find(c => c.ID === effectiveId) ?? null
      setCompany(found)
    } catch (e: any) {
      setError(e?.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }, [databasePath, effectiveId])

  useEffect(() => {
    void loadCompany()
  }, [loadCompany])

  const loadDefaults = useCallback(async () => {
    if (!databasePath || !effectiveId) return
    setDefaultsLoading(true)
    try {
      const def = await GetCompanyDefaults(databasePath, effectiveId)
      setDefaults({ DefaultCurrency: def?.DefaultCurrency ?? 'USD', DefaultTaxRate: Number(def?.DefaultTaxRate ?? 0) })
    } finally {
      setDefaultsLoading(false)
    }
  }, [databasePath, effectiveId])

  // Load defaults on mount/when company changes
  useEffect(() => {
    void loadDefaults()
  }, [loadDefaults])

  const getIconSrc = useCallback((b64?: string | null) => {
    if (!b64) return null
    const trimmed = b64.trim()
    if (!trimmed) return null
    return `data:image/*;base64,${trimmed}`
  }, [])

  const handleSave = useCallback(async (payload: Company) => {
    if (!databasePath) return
    setLoading(true)
    setError(null)
    try {
      const updated = await UpdateCompany(databasePath, payload)
      if (!updated) throw new Error('Failed to update company')
      await loadCompany()
      setShowModal(false)
    } catch (e: any) {
      setError(e?.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }, [databasePath, loadCompany])

  if (!effectiveId) {
    return <div className="text-sm text-red-400">No company selected</div>
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold heading-primary">Company Info</h2>
      </div>
      {loading && <div className="text-sm text-muted">Loading…</div>}
      {error && <div className="text-sm text-red-400">Error: {error}</div>}
      {!loading && company && (
        <div className="card p-4 grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {getIconSrc((company as any).IconB64) ? (
                <img src={getIconSrc((company as any).IconB64) as string} alt={`${company.Name} logo`} className="w-14 h-14 rounded-md object-cover" />
              ) : (
                <div
                  className="w-14 h-14 rounded-md grid place-items-center"
                  style={{ background: 'var(--color-surface-solid)', color: 'var(--color-text-muted)', border: '1px solid var(--color-surface-border)' }}
                  aria-label="No logo"
                >
                  <img src="/camera.svg" alt="No logo" className="w-7 h-7 opacity-80" />
                </div>
              )}
              <div>
                <div className="text-lg font-medium">{company.Name}</div>
                <div className="text-xs text-muted">ID: {company.ID}</div>
              </div>
            </div>
            <button className="btn btn-secondary" onClick={() => setShowModal(true)} disabled={!company}>Edit company</button>
          </div>
          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-muted">Tax ID</div>
              <div className="font-medium">{company.TaxID || '—'}</div>
            </div>
            <div className="sm:col-span-2">
              <div className="text-muted">Address</div>
              <div className="font-medium">{company.Address || '—'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Defaults Card */}
      {!loading && (
        <div className="card p-4 grid gap-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-medium">Defaults</div>
              <div className="text-xs text-muted">Applied when creating new invoices</div>
            </div>
            <button className="btn btn-secondary" onClick={() => setShowDefaults(true)}>Edit</button>
          </div>
          {defaultsLoading ? (
            <div className="text-sm text-muted">Loading…</div>
          ) : (
            <div className="grid sm:grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-muted">Default Currency</div>
                <div className="font-medium">{defaults?.DefaultCurrency ?? 'USD'}</div>
              </div>
              <div>
                <div className="text-muted">Default Tax Rate</div>
                <div className="font-medium">{Number(defaults?.DefaultTaxRate ?? 0)}%</div>
              </div>
            </div>
          )}
        </div>
      )}

      <CompanyEditorModal
        open={showModal}
        initial={company ?? undefined}
        onClose={() => setShowModal(false)}
        onSubmit={handleSave}
        title="Edit company"
      />

      {/* Defaults Modal */}
      {showDefaults && (
        <CompanyDefaultsModal
          open={showDefaults}
          initial={defaults}
          onClose={() => setShowDefaults(false)}
          onSubmit={async (vals) => {
            if (!databasePath || !effectiveId) return
            await UpdateCompanyDefaults(databasePath, { CompanyID: effectiveId, DefaultCurrency: vals.DefaultCurrency, DefaultTaxRate: Number(vals.DefaultTaxRate) } as any)
            setShowDefaults(false)
            await loadDefaults()
          }}
        />
      )}
    </div>
  )
}
