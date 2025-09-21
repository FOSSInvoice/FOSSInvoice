import { useEffect, useMemo, useState } from 'react'
import Modal from './Modal'

export type CompanyContact = {
  Email: string | null
  Phone: string | null
  Website?: string | null
}

type Props = {
  open: boolean
  initial?: CompanyContact | null
  onClose: () => void
  onSubmit: (values: CompanyContact) => Promise<void> | void
}

export default function CompanyContactModal({ open, initial, onClose, onSubmit }: Props) {
  const [email, setEmail] = useState<string>('')
  const [phone, setPhone] = useState<string>('')
  const [website, setWebsite] = useState<string>('')

  useEffect(() => {
    if (!open) return
    setEmail(initial?.Email ?? '')
    setPhone(initial?.Phone ?? '')
    setWebsite(initial?.Website ?? '')
  }, [open, initial?.Email, initial?.Phone, initial?.Website])

  const canSubmit = useMemo(() => true, [])

  if (!open) return null

  return (
    <Modal open={open} onClose={onClose}>
      <div>
        <h3 className="text-lg font-medium heading-primary">Company Contact Info</h3>
        <div className="grid gap-3 mt-3">
          <input className="input" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="input" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input className="input" placeholder="Website" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </div>
        <div className="modal-actions mt-4">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!canSubmit} onClick={() => void onSubmit({ Email: email.trim() || null, Phone: phone.trim() || null, Website: website.trim() || null })}>
            Save
          </button>
        </div>
      </div>
    </Modal>
  )
}
