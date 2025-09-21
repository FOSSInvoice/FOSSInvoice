import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Modal from './Modal'
import type { ClientLite, InvoiceDraft, ItemDraft } from '../types/invoice'

export type InvoiceEditorModalProps = {
  isOpen: boolean
  clients: ClientLite[]
  initialDraft: InvoiceDraft
  editingId: number | null
  loading?: boolean
  onClose: () => void
  onSubmit: (draft: InvoiceDraft) => Promise<void> | void
}
/**
 * Invoice editor modal component.
 *
 * Props contract:
 * - isOpen: controls visibility
 * - clients: list of selectable clients
 * - initialDraft: invoice draft to edit (used to initialize local state)
 * - editingId: when not null, switches wording to Save; null => Create
 * - loading: disables submit while saving
 * - onClose: invoked when closing/canceling
 * - onSubmit: called with current draft when submitting
 */
export default function InvoiceEditorModal({ isOpen, clients, initialDraft, editingId, loading = false, onClose, onSubmit }: InvoiceEditorModalProps) {
  const [draft, setDraft] = useState<InvoiceDraft>(initialDraft)

  // Reset local state when initialDraft changes
  useEffect(() => {
    setDraft({ ...initialDraft, FooterText: initialDraft.FooterText ?? '' })
  }, [initialDraft])

  const computeTotals = useCallback((items: ItemDraft[], taxRate: number, discount: number) => {
    const subtotal = items.reduce((acc, it) => acc + (it.Quantity * it.UnitPrice), 0)
    const taxAmount = subtotal * (taxRate / 100)
    const total = subtotal + taxAmount - (discount || 0)
    return { subtotal, taxAmount, total }
  }, [])

  const addItem = useCallback(() => {
    setDraft(d => ({ ...d, Items: [...d.Items, { Description: '', Quantity: 1, UnitPrice: 0, Total: 0 }] }))
  }, [])

  const updateItem = useCallback((index: number, patch: Partial<ItemDraft>) => {
    setDraft(d => {
      const items = d.Items.map((it, i) => i === index ? { ...it, ...patch } : it)
      const it = items[index]
      it.Total = it.Quantity * it.UnitPrice
      return { ...d, Items: items }
    })
  }, [])

  const removeItem = useCallback((index: number) => {
    setDraft(d => ({ ...d, Items: d.Items.filter((_, i) => i !== index) }))
  }, [])

  const totals = useMemo(() => computeTotals(draft.Items, draft.TaxRate, draft.DiscountAmount), [computeTotals, draft.DiscountAmount, draft.Items, draft.TaxRate])

  // Searchable client combobox (same style as filter selector)
  const [clientQuery, setClientQuery] = useState('')
  const [clientOpen, setClientOpen] = useState(false)
  const [clientHighlight, setClientHighlight] = useState(0)
  const clientComboRef = useRef<HTMLDivElement | null>(null)
  const clientsMap = useMemo(() => {
    const m = new Map<number, string>()
    for (const c of clients) m.set(c.ID, c.Name)
    return m
  }, [clients])
  const filteredClients = useMemo(() => {
    const q = clientQuery.trim().toLowerCase()
    return q ? clients.filter(c => c.Name?.toLowerCase().includes(q)) : clients
  }, [clientQuery, clients])
  const MAX_CLIENT_OPTIONS = 5
  const visibleClients = useMemo(() => filteredClients.slice(0, MAX_CLIENT_OPTIONS), [filteredClients])
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (clientComboRef.current && !clientComboRef.current.contains(e.target as Node)) {
        setClientOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  // Common ISO 4217 currencies; ensure current value stays available
  const currencyOptions = useMemo(() => {
    const common = ['EUR', 'USD', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SEK', 'NZD']
    return draft.Currency && !common.includes(draft.Currency)
      ? [draft.Currency, ...common]
      : common
  }, [draft.Currency])

  // Allowed statuses; keep current if unknown to avoid breaking existing data
  const statusOptions = useMemo(() => {
    const allowed = ['Draft', 'Pending', 'Paid', 'Void']
    return draft.Status && !allowed.includes(draft.Status)
      ? [draft.Status, ...allowed]
      : allowed
  }, [draft.Status])

  if (!isOpen) return null

  return (
    <Modal open={isOpen} onClose={onClose} contentClassName="modal modal-wide">
      <div>
        <h3 className="text-lg font-medium heading-primary">{editingId ? 'Edit invoice' : 'Create a new invoice'}</h3>
        <div className="grid gap-4 mt-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="grid gap-1">
              <label className="text-sm text-muted">Client</label>
              <div className="relative" ref={clientComboRef}>
                <input
                  className="input"
                  role="combobox"
                  aria-expanded={clientOpen}
                  aria-controls="invoice-client-combobox-list"
                  placeholder="Select client"
                  value={clientOpen ? clientQuery : (clientsMap.get(draft.ClientID) ?? '')}
                  onFocus={() => { setClientOpen(true); setClientHighlight(0) }}
                  onChange={(e) => { setClientQuery(e.target.value); setClientOpen(true); setClientHighlight(0) }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault()
                      setClientOpen(true)
                      setClientHighlight((i) => Math.min(i + 1, visibleClients.length - 1))
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault()
                      setClientOpen(true)
                      setClientHighlight((i) => Math.max(i - 1, 0))
                    } else if (e.key === 'Enter') {
                      e.preventDefault()
                      const pick = visibleClients[clientHighlight]
                      if (pick) {
                        setDraft(d => ({ ...d, ClientID: pick.ID }))
                        setClientQuery('')
                        setClientOpen(false)
                      }
                    } else if (e.key === 'Escape') {
                      e.preventDefault()
                      setClientOpen(false)
                    }
                  }}
                />
                {clientOpen && (
                  <div
                    id="invoice-client-combobox-list"
                    role="listbox"
                    className="absolute z-50 mt-1 w-full card card-solid max-h-64 overflow-auto"
                  >
                    {visibleClients.length === 0 && (
                      <div className="px-2 py-2 text-sm text-muted">No results</div>
                    )}
                    {visibleClients.map((c, idx) => (
                      <div
                        key={c.ID}
                        role="option"
                        aria-selected={draft.ClientID === c.ID}
                        className={`px-2 py-1 cursor-pointer rounded ${idx === clientHighlight ? 'bg-white/10' : 'hover:bg-white/5'}`}
                        onMouseEnter={() => setClientHighlight(idx)}
                        onMouseDown={(e) => { e.preventDefault() }}
                        onClick={() => {
                          setDraft(d => ({ ...d, ClientID: c.ID }))
                          setClientQuery('')
                          setClientOpen(false)
                        }}
                      >
                        {c.Name}
                      </div>
                    ))}
                    {filteredClients.length > visibleClients.length && (
                      <div className="px-2 py-2 text-xs text-muted">Showing {visibleClients.length} of {filteredClients.length} — keep typing to narrow</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="grid gap-1">
              <label className="text-sm text-muted">Invoice Number</label>
              <input
                className="input"
                value={draft.Number}
                onChange={e => {
                  const v = e.target.value
                  const n = Number(v)
                  setDraft({ ...draft, Number: v === '' || Number.isNaN(n) ? '' : n })
                }}
              />
            </div>
            <div className="grid gap-1">
              <label className="text-sm text-muted">Fiscal Year</label>
              <input
                className="input"
                value={draft.FiscalYear}
                onChange={e => {
                  const v = e.target.value
                  const n = Number(v)
                  setDraft({ ...draft, FiscalYear: v === '' || Number.isNaN(n) ? '' : n })
                }}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div className="grid gap-1">
              <label className="text-sm text-muted">Issue Date</label>
              <input type="date" className="input" value={draft.IssueDate} onChange={e => setDraft({ ...draft, IssueDate: e.target.value })} />
            </div>
            <div className="grid gap-1">
              <label className="text-sm text-muted">Due Date</label>
              <input type="date" className="input" value={draft.DueDate} onChange={e => setDraft({ ...draft, DueDate: e.target.value })} />
            </div>
            <div className="grid gap-1">
              <label className="text-sm text-muted">Currency</label>
              <select
                className="input"
                value={draft.Currency}
                onChange={e => setDraft({ ...draft, Currency: e.target.value })}
              >
                {currencyOptions.map(code => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div className="grid gap-1">
              <label className="text-sm text-muted">Tax Rate (%)</label>
              <input
                className="input"
                value={draft.TaxRate}
                onChange={e => setDraft({ ...draft, TaxRate: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="grid gap-1">
              <label className="text-sm text-muted">Discount</label>
              <input
                className="input"
                value={draft.DiscountAmount}
                onChange={e => setDraft({ ...draft, DiscountAmount: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="grid gap-1">
              <label className="text-sm text-muted">Status</label>
              <select
                className="input"
                value={draft.Status}
                onChange={e => setDraft({ ...draft, Status: e.target.value })}
              >
                {statusOptions.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-1">
            <label className="text-sm text-muted">Notes</label>
            <textarea className="input" rows={3} value={draft.Notes} onChange={e => setDraft({ ...draft, Notes: e.target.value })} />
          </div>

          <div className="grid gap-1">
            <label className="text-sm text-muted">Footer Text</label>
            <textarea className="input" rows={2} value={draft.FooterText} onChange={e => setDraft({ ...draft, FooterText: e.target.value })} />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted">Items</div>
              <button className="btn btn-secondary" onClick={addItem}>Add item</button>
            </div>
            <div className="grid gap-2">
              {draft.Items.length === 0 && (
                <div className="text-sm text-muted">No items added.</div>
              )}
              {draft.Items.map((it, idx) => (
                <div key={idx} className="grid sm:grid-cols-[1fr_120px_120px_120px_auto] gap-2 items-center">
                  <input className="input" placeholder="Description" value={it.Description} onChange={e => updateItem(idx, { Description: e.target.value })} />
                  <input className="input" placeholder="Qty" value={it.Quantity} onChange={e => updateItem(idx, { Quantity: Number(e.target.value) || 0 })} />
                  <input className="input" placeholder="Unit price" value={it.UnitPrice} onChange={e => updateItem(idx, { UnitPrice: Number(e.target.value) || 0 })} />
                  <div className="text-sm">{(it.Quantity * it.UnitPrice).toFixed(2)}</div>
                  <button className="btn btn-secondary" onClick={() => removeItem(idx)}>Remove</button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            <div className="grid gap-1"><div className="text-muted">Subtotal</div><div className="font-medium">{totals.subtotal.toFixed(2)}</div></div>
            <div className="grid gap-1"><div className="text-muted">Tax</div><div className="font-medium">{totals.taxAmount.toFixed(2)}</div></div>
            <div className="grid gap-1"><div className="text-muted">Total</div><div className="font-medium">{totals.total.toFixed(2)}</div></div>
          </div>
        </div>

        <div className="modal-actions mt-4">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => void onSubmit(draft)} disabled={loading || draft.Number === ''}>
            {editingId ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
