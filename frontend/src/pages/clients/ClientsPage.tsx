import { useCallback, useEffect, useMemo, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPen, faTrash } from '@fortawesome/free-solid-svg-icons'
import Modal from '../../components/Modal'
import { useParams } from 'react-router-dom'
import { useSelectedCompany } from '../../context/SelectedCompanyContext'
import { useDatabasePath } from '../../context/DatabasePathContext'
import { Client, ContactInfo } from '../../../bindings/github.com/fossinvoice/fossinvoice/internal/models/models.js'
import { DatabaseService } from '../../../bindings/github.com/fossinvoice/fossinvoice/internal/services'
import { useToast } from '../../context/ToastContext'
import { useI18n } from '../../i18n'

type ClientDraft = {
  ID?: number
  Name: string
  Address: string
  TaxID: string
  Email: string
  Phone: string
  Website: string
}

export default function ClientsPage() {
  const { t } = useI18n()
  const { companyId } = useParams()
  const { selectedCompanyId } = useSelectedCompany()
  const { databasePath } = useDatabasePath()
  const toast = useToast()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clients, setClients] = useState<Client[]>([])

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [draft, setDraft] = useState<ClientDraft>({ Name: '', Address: '', TaxID: '', Email: '', Phone: '', Website: '' })

  const effectiveCompanyId = useMemo(() => {
    const fromRoute = companyId ? Number(companyId) : null
    return !Number.isNaN(fromRoute as number) && fromRoute ? fromRoute : selectedCompanyId ?? null
  }, [companyId, selectedCompanyId])

  // Use generated static bindings

  const list = useCallback(async () => {
    if (!databasePath || !effectiveCompanyId) return
    setLoading(true)
    setError(null)
    try {
  const list: Client[] = await DatabaseService.ListClients(databasePath, effectiveCompanyId)
      setClients(list)
    } catch (e: any) {
      const msg = e?.message ?? String(e)
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [databasePath, effectiveCompanyId, toast])

  useEffect(() => { void list() }, [list])

  const openCreate = useCallback(() => {
    setEditing(null)
    setDraft({ Name: '', Address: '', TaxID: '', Email: '', Phone: '', Website: '' })
    setShowModal(true)
  }, [])

  const openEdit = useCallback((c: Client) => {
    setEditing(c)
    setDraft({
      ID: c.ID,
      Name: c.Name ?? '',
      Address: c.Address ?? '',
      TaxID: c.TaxID ?? '',
      Email: c.Contact?.Email ?? '',
      Phone: c.Contact?.Phone ?? '',
      Website: c.Contact?.Website ?? '',
    })
    setShowModal(true)
  }, [])

  const closeModal = useCallback(() => {
    setShowModal(false)
  }, [])

  const submit = useCallback(async () => {
    if (!databasePath || !effectiveCompanyId) return
    if (!draft.Name.trim()) return
    setLoading(true)
    setError(null)
    try {
      const payload = new Client({
        ID: draft.ID ?? 0,
        CompanyID: effectiveCompanyId,
        Name: draft.Name.trim(),
        Address: draft.Address.trim(),
        TaxID: draft.TaxID.trim(),
        Contact: new ContactInfo({
          Email: draft.Email.trim() || null,
          Phone: draft.Phone.trim() || null,
          Website: draft.Website.trim() || null,
        }),
      })

      if (editing) {
        const updated = await DatabaseService.UpdateClient(databasePath, payload as any)
        if (!updated) throw new Error(t('messages.failedUpdateClient'))
        toast.success(t('messages.clientUpdated'))
      } else {
        const created = await DatabaseService.CreateClient(databasePath, effectiveCompanyId, payload as any)
        if (!created) throw new Error(t('messages.failedCreateClient'))
        toast.success(t('messages.clientCreated'))
      }
      await list()
      setShowModal(false)
      setEditing(null)
    } catch (e: any) {
      const msg = e?.message ?? String(e)
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [databasePath, draft, editing, effectiveCompanyId, list, toast])

  const remove = useCallback(async (id: number) => {
    if (!databasePath) return
    setLoading(true)
    setError(null)
    try {
      await DatabaseService.DeleteClient(databasePath, id)
      await list()
      toast.success(t('messages.clientDeleted'))
    } catch (e: any) {
      const msg = e?.message ?? String(e)
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [databasePath, list, toast])

  if (!effectiveCompanyId) {
    return <div className="text-sm text-error">{t('messages.noCompanySelected')}</div>
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-semibold heading-primary">{t('common.clients')}</h2>
      </div>
      {loading && <div className="text-sm text-muted">{t('common.loading')}</div>}
      {error && <div className="text-sm text-error">{t('common.error')}: {error}</div>}

      {clients.length === 0 ? (
        <div className="text-sm text-muted">No clients yet. Create one to get started.</div>
      ) : (
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {clients.map((c) => (
            <li key={c.ID} className="card p-4 flex flex-col gap-2">
              <div className="font-medium truncate">{c.Name}</div>
              <div className="text-xs text-muted truncate">{t('messages.taxID')}: {c.TaxID || '—'}</div>
              <div className="text-xs text-muted truncate">{t('messages.address')}: {c.Address || '—'}</div>
              <div className="mt-2 flex gap-2">
                <button
                  className="icon-btn"
                  aria-label={t('messages.editClient')}
                  title={t('common.edit')}
                  onClick={() => openEdit(c)}
                >
                  <FontAwesomeIcon icon={faPen} />
                </button>
                <button
                  className="icon-btn"
                  aria-label={`${t('common.delete')} ${t('common.client')}`}
                  title={t('common.delete')}
                  onClick={() => remove(c.ID)}
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showModal && (
        <Modal open={showModal} onClose={closeModal}>
          <div>
            <h3 className="text-lg font-medium heading-primary">{editing ? t('messages.editClient') : t('messages.createNewClient')}</h3>
            <div className="grid gap-3 mt-3">
              <input className="input" placeholder={t('messages.name') ?? 'Name'} value={draft.Name} onChange={(e) => setDraft({ ...draft, Name: e.target.value })} />
              <input className="input" placeholder={t('messages.taxID')} value={draft.TaxID} onChange={(e) => setDraft({ ...draft, TaxID: e.target.value })} />
              <input className="input" placeholder={t('messages.address')} value={draft.Address} onChange={(e) => setDraft({ ...draft, Address: e.target.value })} />
              <div className="grid sm:grid-cols-3 gap-3">
                <input className="input" placeholder={t('messages.email')} value={draft.Email} onChange={(e) => setDraft({ ...draft, Email: e.target.value })} />
                <input className="input" placeholder={t('messages.phone')} value={draft.Phone} onChange={(e) => setDraft({ ...draft, Phone: e.target.value })} />
                <input className="input" placeholder={t('messages.website')} value={draft.Website} onChange={(e) => setDraft({ ...draft, Website: e.target.value })} />
              </div>
            </div>
            <div className="modal-actions mt-4">
              <button className="btn btn-secondary" onClick={closeModal}>{t('common.cancel')}</button>
              <button className="btn btn-primary" disabled={!draft.Name.trim() || loading} onClick={submit}>{editing ? t('common.save') : t('common.create')}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Floating action button to open client modal */}
      <button className="fab" aria-label={t('messages.createNewClient')} onClick={openCreate}>+</button>
    </div>
  )
}
