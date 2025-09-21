import { useEffect, useMemo, useState } from 'react'
import Modal from './Modal'
import { COMMON_CURRENCIES, withCurrentFirst } from '../constants/options'
import { useI18n } from '../i18n'

export type CompanyDefaults = {
  DefaultCurrency: string
  DefaultTaxRate: number
  DefaultFooterText?: string
}

type Props = {
  open: boolean
  initial?: CompanyDefaults | null
  onClose: () => void
  onSubmit: (values: CompanyDefaults) => Promise<void> | void
}

export default function CompanyDefaultsModal({ open, initial, onClose, onSubmit }: Props) {
  const { t } = useI18n()
  const [currency, setCurrency] = useState('USD')
  const [taxRate, setTaxRate] = useState(0)
  const [footer, setFooter] = useState('')

  useEffect(() => {
    if (!open) return
    setCurrency(initial?.DefaultCurrency ?? 'USD')
    setTaxRate(Number(initial?.DefaultTaxRate ?? 0))
    setFooter(initial?.DefaultFooterText ?? '')
  }, [open, initial?.DefaultCurrency, initial?.DefaultTaxRate, initial?.DefaultFooterText])

  const currencyOptions = useMemo(() => withCurrentFirst(COMMON_CURRENCIES, currency), [currency])

  if (!open) return null

  return (
    <Modal open={open} onClose={onClose}>
      <div>
        <h3 className="text-lg font-medium heading-primary">{t('messages.companyDefaults')}</h3>
        <div className="grid gap-3 mt-3">
          <div className="grid gap-1">
            <label className="text-sm text-muted">{t('messages.defaultCurrency')}</label>
            <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {currencyOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid gap-1">
            <label className="text-sm text-muted">{t('messages.defaultTaxRate')}</label>
            <input className="input" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value) || 0)} />
          </div>
          <div className="grid gap-1">
            <label className="text-sm text-muted">{t('messages.defaultFooterText')}</label>
            <textarea className="input" rows={2} value={footer} onChange={(e) => setFooter(e.target.value)} />
          </div>
        </div>
        <div className="modal-actions mt-4">
          <button className="btn btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn btn-primary" onClick={() => void onSubmit({ DefaultCurrency: currency, DefaultTaxRate: Number(taxRate), DefaultFooterText: footer })}>
            {t('common.save')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
