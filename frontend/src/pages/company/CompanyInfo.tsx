import { useCallback, useEffect, useMemo, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPen } from '@fortawesome/free-solid-svg-icons'
import { useParams } from 'react-router-dom'
import { useSelectedCompany } from '../../context/SelectedCompanyContext'
import { useDatabasePath } from '../../context/DatabasePathContext'
import { DatabaseService } from '../../../bindings/github.com/fossinvoice/fossinvoice/internal/services'
import { Company } from '../../../bindings/github.com/fossinvoice/fossinvoice/internal/models/models.js'
import CompanyDefaultsModal from '../../components/CompanyDefaultsModal'
import CompanyContactModal from '../../components/CompanyContactModal'
import CompanyEditorModal from '../../components/CompanyEditorModal'
import { useI18n } from '../../i18n'

export default function CompanyInfo() {
  const { t } = useI18n()
  const { companyId } = useParams()
  const { selectedCompanyId } = useSelectedCompany()
  const { databasePath } = useDatabasePath()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showDefaults, setShowDefaults] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [defaultsLoading, setDefaultsLoading] = useState(false)
  const [defaults, setDefaults] = useState<{ DefaultCurrency: string; DefaultTaxRate: number; DefaultFooterText?: string } | null>(null)

  const effectiveId = useMemo(() => {
    const fromRoute = companyId ? Number(companyId) : null
    return !Number.isNaN(fromRoute as number) && fromRoute ? fromRoute : selectedCompanyId
  }, [companyId, selectedCompanyId])

  const loadCompany = useCallback(async () => {
    if (!databasePath || !effectiveId) return
    setLoading(true)
    setError(null)
    try {
  const list = await DatabaseService.ListCompanies(databasePath)
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
  const def = await DatabaseService.GetCompanyDefaults(databasePath, effectiveId)
    setDefaults({ DefaultCurrency: def?.DefaultCurrency ?? 'USD', DefaultTaxRate: Number(def?.DefaultTaxRate ?? 0), DefaultFooterText: (def as any)?.DefaultFooterText ?? '' })
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
  const updated = await DatabaseService.UpdateCompany(databasePath, payload)
      if (!updated) throw new Error('Failed to update company')
      await loadCompany()
      setShowModal(false)
    } catch (e: any) {
      setError(e?.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }, [databasePath, loadCompany])

  const handleSaveContact = useCallback(async (values: { Email: string | null; Phone: string | null; Website?: string | null }) => {
    if (!databasePath || !company) return
    setLoading(true)
    setError(null)
    try {
      // Preserve other company fields; update embedded contact
      const payload = new Company({
        ID: company.ID,
        Name: company.Name,
        Address: company.Address,
        TaxID: company.TaxID,
        IconB64: (company as any).IconB64 ?? '',
        Contact: { ...company.Contact, Email: values.Email, Phone: values.Phone, Website: values?.Website ?? company.Contact?.Website ?? null },
      })
      const updated = await DatabaseService.UpdateCompany(databasePath, payload)
      if (!updated) throw new Error('Failed to update contact info')
      await loadCompany()
      setShowContactModal(false)
    } catch (e: any) {
      setError(e?.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }, [company, databasePath, loadCompany])

  if (!effectiveId) {
    return <div className="text-sm text-red-400">{t('messages.noCompanySelected')}</div>
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold heading-primary">{t('common.companyInfo')}</h2>
      </div>
      {loading && <div className="text-sm text-muted">{t('common.loading')}</div>}
      {error && <div className="text-sm text-red-400">{t('common.error')}: {error}</div>}
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
                  aria-label={t('messages.noLogo')}
                >
                  <img src="/camera.svg" alt={t('messages.noLogo')} className="w-7 h-7 opacity-80" />
                </div>
              )}
              <div>
                <div className="text-lg font-medium">{company.Name}</div>
                <div className="text-xs text-muted">{t('messages.id')}: {company.ID}</div>
              </div>
            </div>
            <button
              className="icon-btn"
              aria-label={t('messages.editCompany')}
              title={t('messages.editCompany')}
              onClick={() => setShowModal(true)}
              disabled={!company}
            >
              <FontAwesomeIcon icon={faPen} />
            </button>
          </div>
          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-muted">{t('messages.taxID')}</div>
              <div className="font-medium">{company.TaxID || '—'}</div>
            </div>
            <div className="sm:col-span-2">
              <div className="text-muted">{t('messages.address')}</div>
              <div className="font-medium">{company.Address || '—'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Card */}
      {!loading && company && (
        <div className="card p-4 grid gap-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-medium">{t('messages.contact')}</div>
              <div className="text-xs text-muted">{t('messages.emailAndPhoneHint')}</div>
            </div>
            <button
              className="icon-btn"
              aria-label={t('messages.editContact')}
              title={t('messages.editContact')}
              onClick={() => setShowContactModal(true)}
            >
              <FontAwesomeIcon icon={faPen} />
            </button>
          </div>
          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-muted">{t('messages.email')}</div>
              <div className="font-medium">{company.Contact?.Email || '—'}</div>
            </div>
            <div>
              <div className="text-muted">{t('messages.phone')}</div>
              <div className="font-medium">{company.Contact?.Phone || '—'}</div>
            </div>
            <div>
              <div className="text-muted">{t('messages.website')}</div>
              <div className="font-medium">{company.Contact?.Website || '—'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Defaults Card */}
      {!loading && (
        <div className="card p-4 grid gap-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-medium">{t('messages.defaults')}</div>
              <div className="text-xs text-muted">{t('messages.appliedOnCreate')}</div>
            </div>
            <button
              className="icon-btn"
              aria-label={t('messages.editDefaults')}
              title={t('messages.editDefaults')}
              onClick={() => setShowDefaults(true)}
            >
              <FontAwesomeIcon icon={faPen} />
            </button>
          </div>
          {defaultsLoading ? (
            <div className="text-sm text-muted">{t('common.loading')}</div>
          ) : (
            <div className="grid sm:grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-muted">{t('messages.defaultCurrency')}</div>
                <div className="font-medium">{defaults?.DefaultCurrency ?? 'USD'}</div>
              </div>
              <div>
                <div className="text-muted">{t('messages.defaultTaxRate')}</div>
                <div className="font-medium">{Number(defaults?.DefaultTaxRate ?? 0)}%</div>
              </div>
              <div className="sm:col-span-3">
                <div className="text-muted">{t('messages.defaultFooterText')}</div>
                <div className="font-medium whitespace-pre-wrap">{defaults?.DefaultFooterText ?? ''}</div>
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
        title={t('messages.editCompany')}
      />

      {/* Contact Modal */}
      {showContactModal && (
        <CompanyContactModal
          open={showContactModal}
          initial={{ Email: company?.Contact?.Email ?? null, Phone: company?.Contact?.Phone ?? null, Website: company?.Contact?.Website ?? null }}
          onClose={() => setShowContactModal(false)}
          onSubmit={handleSaveContact}
        />
      )}

      {/* Defaults Modal */}
      {showDefaults && (
        <CompanyDefaultsModal
          open={showDefaults}
          initial={defaults}
          onClose={() => setShowDefaults(false)}
          onSubmit={async (vals) => {
            if (!databasePath || !effectiveId) return
            await DatabaseService.UpdateCompanyDefaults(databasePath, { CompanyID: effectiveId, DefaultCurrency: vals.DefaultCurrency, DefaultTaxRate: Number(vals.DefaultTaxRate), DefaultFooterText: (vals as any)?.DefaultFooterText ?? '' } as any)
            setShowDefaults(false)
            await loadDefaults()
          }}
        />
      )}
    </div>
  )
}
