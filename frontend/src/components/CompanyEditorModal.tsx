import { useEffect, useMemo, useState, useCallback, ChangeEvent } from 'react'
import Modal from './Modal'
import { Company } from '../../bindings/github.com/fossinvoice/fossinvoice/internal/models/models.js'
import { useI18n } from '../i18n'

type Props = {
  open: boolean
  initial?: Company | null
  onClose: () => void
  onSubmit: (company: Company) => Promise<void> | void
  title?: string
  submitting?: boolean
}

export default function CompanyEditorModal({ open, initial, onClose, onSubmit, title, submitting }: Props) {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [taxID, setTaxID] = useState('')
  const [address, setAddress] = useState('')
  const [iconB64, setIconB64] = useState('')
  const [localSubmitting, setLocalSubmitting] = useState(false)

  const isEdit = !!(initial && initial.ID > 0)
  const canSubmit = useMemo(() => name.trim().length > 0 && !(submitting ?? localSubmitting), [name, submitting, localSubmitting])

  useEffect(() => {
    if (!open) return
    setName(initial?.Name ?? '')
    setTaxID(initial?.TaxID ?? '')
    setAddress(initial?.Address ?? '')
    setIconB64((initial as any)?.IconB64 ?? '')
  }, [open, initial])

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

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return
    setLocalSubmitting(true)
    try {
      const payload = new Company({
        ID: initial?.ID ?? 0,
        Name: name.trim(),
        Address: address.trim(),
        TaxID: taxID.trim(),
        IconB64: iconB64.trim(),
      })
      await onSubmit(payload)
    } finally {
      setLocalSubmitting(false)
    }
  }, [address, canSubmit, iconB64, initial?.ID, name, onSubmit, taxID])

  if (!open) return null

  return (
    <Modal open={open} onClose={onClose}>
      <div>
        <h3 className="text-lg font-medium heading-primary">{title ?? (isEdit ? t('messages.editCompany') : t('messages.createNewCompany'))}</h3>
        <div className="grid gap-3 mt-3">
          <input className="input" placeholder={t('messages.name') ?? 'Name'} value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input" placeholder={t('messages.taxID')} value={taxID} onChange={(e) => setTaxID(e.target.value)} />
          <input className="input" placeholder={t('messages.address')} value={address} onChange={(e) => setAddress(e.target.value)} />
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
                  <img src="/camera.svg" alt={t('messages.noLogo')} className="w-6 h-6 opacity-80" />
                </div>
              )}
              <input type="file" accept="image/*" className="input" onChange={onIconFileChange} />
              {iconB64 && (
                <button
                  type="button"
                  className="btn btn-secondary btn-compact"
                  onClick={() => setIconB64('')}
                  aria-label={`${t('common.delete')} icon`}
                >
                  {t('common.delete')}
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="modal-actions mt-4">
          <button className="btn btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={!canSubmit}>
            {isEdit ? t('common.save') : t('common.create')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
