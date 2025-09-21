import { useEffect, useMemo, useState } from 'react'
import Modal from './Modal'

export type CompanyDefaults = {
  DefaultCurrency: string
  DefaultTaxRate: number
}

type Props = {
  open: boolean
  initial?: CompanyDefaults | null
  onClose: () => void
  onSubmit: (values: CompanyDefaults) => Promise<void> | void
}

export default function CompanyDefaultsModal({ open, initial, onClose, onSubmit }: Props) {
  const [currency, setCurrency] = useState('USD')
  const [taxRate, setTaxRate] = useState(0)

  useEffect(() => {
    if (!open) return
    setCurrency(initial?.DefaultCurrency ?? 'USD')
    setTaxRate(Number(initial?.DefaultTaxRate ?? 0))
  }, [open, initial?.DefaultCurrency, initial?.DefaultTaxRate])

  const currencyOptions = useMemo(() => {
    const common = ['EUR','USD','GBP','JPY','AUD','CAD','CHF','CNY','SEK','NZD']
    return currency && !common.includes(currency) ? [currency, ...common] : common
  }, [currency])

  if (!open) return null

  return (
    <Modal open={open} onClose={onClose}>
      <div>
        <h3 className="text-lg font-medium heading-primary">Company Defaults</h3>
        <div className="grid gap-3 mt-3">
          <div className="grid gap-1">
            <label className="text-sm text-muted">Default Currency</label>
            <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {currencyOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid gap-1">
            <label className="text-sm text-muted">Default Tax Rate (%)</label>
            <input className="input" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value) || 0)} />
          </div>
        </div>
        <div className="modal-actions mt-4">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => void onSubmit({ DefaultCurrency: currency, DefaultTaxRate: Number(taxRate) })}>
            Save
          </button>
        </div>
      </div>
    </Modal>
  )
}
