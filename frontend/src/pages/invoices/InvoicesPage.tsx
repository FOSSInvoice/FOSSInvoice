import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPen, faTrash, faFilePdf } from '@fortawesome/free-solid-svg-icons'
import { useParams } from 'react-router-dom'
import { useSelectedCompany } from '../../context/SelectedCompanyContext'
import { useDatabasePath } from '../../context/DatabasePathContext'
import type { ClientLite, InvoiceDraft, ItemDraft } from '../../types/invoice'
import InvoiceEditorModal from '../../components/InvoiceEditorModal'
import { DatabaseService, DialogsService, PDFService } from '../../../bindings/github.com/fossinvoice/fossinvoice/internal/services'
import { useToast } from '../../context/ToastContext'

export default function InvoicesPage() {
  const { companyId } = useParams()
  const { selectedCompanyId } = useSelectedCompany()
  const { databasePath } = useDatabasePath()
  const toast = useToast()

  const effectiveCompanyId = useMemo(() => {
    const fromRoute = companyId ? Number(companyId) : null
    return !Number.isNaN(fromRoute as number) && fromRoute ? fromRoute : selectedCompanyId ?? null
  }, [companyId, selectedCompanyId])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [clients, setClients] = useState<ClientLite[]>([])
  const [invoices, setInvoices] = useState<any[]>([])

  // Filters
  const [filterFiscalYear, setFilterFiscalYear] = useState<number | ''>('')
  const [filterClientID, setFilterClientID] = useState<number | 0>(0)
  const [fiscalYears, setFiscalYears] = useState<number[]>([])
  const [clientQuery, setClientQuery] = useState('')
  const [clientOpen, setClientOpen] = useState(false)
  const [clientHighlight, setClientHighlight] = useState(0)
  const clientComboRef = useRef<HTMLDivElement | null>(null)
  const [fyQuery, setFyQuery] = useState('')
  const [fyOpen, setFyOpen] = useState(false)
  const [fyHighlight, setFyHighlight] = useState(0)
  const fyComboRef = useRef<HTMLDivElement | null>(null)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [draft, setDraft] = useState<InvoiceDraft | null>(null)

  // Using generated static bindings

  // Helpers
  const clientsMap = useMemo(() => {
    const m = new Map<number, string>()
    for (const c of clients) m.set(c.ID, c.Name)
    return m
  }, [clients])

  const filteredClients = useMemo(() => {
    const q = clientQuery.trim().toLowerCase()
    const base = q
      ? clients.filter(c => c.Name?.toLowerCase().includes(q))
      : clients
    // Include synthetic "All clients" (ID 0) at the top
    return [{ ID: 0, Name: 'All clients' }, ...base]
  }, [clientQuery, clients])

  const MAX_CLIENT_OPTIONS = 5
  const visibleClients = useMemo(() => filteredClients.slice(0, MAX_CLIENT_OPTIONS), [filteredClients])

  // Close dropdown on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (clientComboRef.current && !clientComboRef.current.contains(e.target as Node)) {
        setClientOpen(false)
      }
      if (fyComboRef.current && !fyComboRef.current.contains(e.target as Node)) {
        setFyOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const computeTotals = useCallback((items: ItemDraft[], taxRate: number, discount: number) => {
    const subtotal = items.reduce((acc, it) => acc + (it.Quantity * it.UnitPrice), 0)
    const taxAmount = subtotal * (taxRate / 100)
    const total = subtotal + taxAmount - (discount || 0)
    return { subtotal, taxAmount, total }
  }, [])

  // Load clients for filter and selection
  const loadClients = useCallback(async () => {
    if (!databasePath || !effectiveCompanyId) return
    try {
      const list = await DatabaseService.ListClients(databasePath, effectiveCompanyId)
      setClients(list?.map((c: any) => ({ ID: c.ID, Name: c.Name })) ?? [])
    } catch (e: any) {
      const msg = e?.message ?? String(e)
      setError(msg)
      toast.error(msg)
    }
  }, [databasePath, effectiveCompanyId])

  // Load invoices with filters
  const loadInvoices = useCallback(async () => {
    if (!databasePath || !effectiveCompanyId) return
    setLoading(true)
    setError(null)
    try {
      const fy = filterFiscalYear === '' ? 0 : Number(filterFiscalYear)
      const cid = filterClientID || 0
      const list = await DatabaseService.ListInvoices(databasePath, effectiveCompanyId, fy, cid)
      setInvoices(list ?? [])
    } catch (e: any) {
      const msg = e?.message ?? String(e)
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [databasePath, effectiveCompanyId, filterClientID, filterFiscalYear])

  // Load fiscal years for filter
  const loadFiscalYears = useCallback(async () => {
    if (!databasePath || !effectiveCompanyId) return
    try {
      const yrs = await DatabaseService.ListFiscalYears(databasePath, effectiveCompanyId)
      setFiscalYears((yrs ?? []).filter((n: any) => typeof n === 'number').sort((a: number, b: number) => b - a))
    } catch (e: any) {
      const msg = e?.message ?? String(e)
      setError(msg)
      toast.error(msg)
    }
  }, [databasePath, effectiveCompanyId])

  useEffect(() => { void loadClients() }, [loadClients])
  useEffect(() => { void loadInvoices() }, [loadInvoices])
  useEffect(() => { void loadFiscalYears() }, [loadFiscalYears])

  const openCreate = useCallback(async () => {
    if (!effectiveCompanyId) return
    setEditingId(null)
    // Determine next invoice number: try backend service, else compute from loaded list
    let nextNumber = 1
    let defaultCurrency = 'USD'
    let defaultTaxRate = 0
    try {
      if (databasePath) {
        const max: any = await DatabaseService.GetMaxInvoiceNumber(databasePath, effectiveCompanyId)
        const n = typeof max === 'number' ? max : Number(max)
        if (Number.isFinite(n) && n >= 0) nextNumber = n + 1
      } else {
        // Fallback: compute from current invoices list (numeric-only)
        const maxLocal = invoices
          .filter(inv => inv.CompanyID === effectiveCompanyId)
          .reduce((acc, inv) => Math.max(acc, Number(inv.Number ?? 0)), 0)
        nextNumber = maxLocal + 1
      }

      // Try to fetch company defaults for currency and tax rate
      if (databasePath) {
        const def: any = await DatabaseService.GetCompanyDefaults(databasePath, effectiveCompanyId)
        if (def) {
          if (typeof def.DefaultCurrency === 'string' && def.DefaultCurrency.trim()) defaultCurrency = def.DefaultCurrency
          if (typeof def.DefaultTaxRate === 'number' && Number.isFinite(def.DefaultTaxRate)) defaultTaxRate = def.DefaultTaxRate
        }
      }
    } catch {
      // Ignore errors and keep default '1'
      const maxLocal = invoices
        .filter((inv: any) => inv.CompanyID === effectiveCompanyId)
        .reduce((acc: number, inv: any) => Math.max(acc, Number(inv.Number ?? 0)), 0)
      nextNumber = maxLocal + 1
    }

    setDraft({
      CompanyID: effectiveCompanyId,
      ClientID: filterClientID || (clients[0]?.ID ?? 0),
  Number: nextNumber,
      FiscalYear: filterFiscalYear || new Date().getFullYear(),
      IssueDate: new Date().toISOString().slice(0, 10),
      DueDate: new Date().toISOString().slice(0, 10),
      Currency: defaultCurrency,
      TaxRate: defaultTaxRate,
      DiscountAmount: 0,
      Status: 'Draft',
      Notes: '',
      Items: [],
    })
    setShowModal(true)
  }, [clients, databasePath, effectiveCompanyId, filterClientID, filterFiscalYear, invoices])

  const openEdit = useCallback(async (id: number) => {
    if (!databasePath) return
    setLoading(true)
    setError(null)
    try {
      const inv = await DatabaseService.GetInvoice(databasePath, id)
      if (!inv) {
        throw new Error('Invoice not found')
      }
      setEditingId(id)
      setDraft({
        ID: inv.ID,
        CompanyID: inv.CompanyID,
        ClientID: inv.ClientID,
        Number: typeof inv.Number === 'number' ? inv.Number : Number(inv.Number ?? 0),
        FiscalYear: inv.FiscalYear ?? '',
        IssueDate: inv.IssueDate ?? '',
        DueDate: inv.DueDate ?? '',
        Currency: inv.Currency ?? 'USD',
        TaxRate: inv.TaxRate ?? 0,
        DiscountAmount: inv.DiscountAmount ?? 0,
        Status: inv.Status ?? 'Draft',
        Notes: inv.Notes ?? '',
        Items: (inv.Items ?? []).map((it: any) => ({
          ID: it.ID,
          Description: it.Description ?? '',
          Quantity: Number(it.Quantity ?? 0),
          UnitPrice: Number(it.UnitPrice ?? 0),
          Total: Number(it.Total ?? 0),
        })),
      })
      setShowModal(true)
    } catch (e: any) {
      const msg = e?.message ?? String(e)
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [databasePath])

  const closeModal = useCallback(() => {
    setShowModal(false)
    setEditingId(null)
    setDraft(null)
  }, [])

  // Item manipulation moved to InvoiceEditorModal

  const submit = useCallback(async (subDraft: InvoiceDraft) => {
    if (!databasePath || !subDraft) return
    if (subDraft.Number === '') return
    const fy = subDraft.FiscalYear === '' ? 0 : Number(subDraft.FiscalYear)
    setLoading(true)
    setError(null)
    try {
      const totals = computeTotals(subDraft.Items, subDraft.TaxRate, subDraft.DiscountAmount)
      const payload = {
        ID: subDraft.ID ?? 0,
        CompanyID: subDraft.CompanyID,
        ClientID: subDraft.ClientID,
        Number: Number(subDraft.Number),
        FiscalYear: fy,
        IssueDate: subDraft.IssueDate,
        DueDate: subDraft.DueDate,
        Currency: subDraft.Currency,
        Subtotal: totals.subtotal,
        TaxRate: subDraft.TaxRate,
        TaxAmount: totals.taxAmount,
        DiscountAmount: subDraft.DiscountAmount,
        Total: totals.total,
        Status: subDraft.Status,
        Notes: subDraft.Notes ? subDraft.Notes : null,
        Items: subDraft.Items.map(it => ({
          ID: it.ID ?? 0,
          Description: it.Description,
          Quantity: it.Quantity,
          UnitPrice: it.UnitPrice,
          Total: it.Total,
        })),
      }

      if (editingId) {
        const updated = await DatabaseService.UpdateInvoice(databasePath, payload as any)
        if (!updated) throw new Error('Failed to update invoice')
      } else {
        const created = await DatabaseService.CreateInvoice(databasePath, payload as any)
        if (!created) throw new Error('Failed to create invoice')
      }
      await loadInvoices()
      await loadFiscalYears()
      closeModal()
    } catch (e: any) {
      const msg = e?.message ?? String(e)
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [closeModal, computeTotals, databasePath, editingId, loadInvoices, loadFiscalYears])

  const remove = useCallback(async (id: number) => {
    if (!databasePath) return
    setLoading(true)
    setError(null)
    try {
      await DatabaseService.DeleteInvoice(databasePath, id)
      await loadInvoices()
  await loadFiscalYears()
    } catch (e: any) {
      const msg = e?.message ?? String(e)
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [databasePath, loadInvoices, loadFiscalYears])

  const exportPDF = useCallback(async (inv: any) => {
    if (!databasePath) { setError('No database selected'); return }
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      // Ask for destination file via static bindings
      const resp = await DialogsService.SelectSaveFile('', 'PDF Files', '*.pdf')
      if (!resp || !resp.Path) { return } // cancelled

      // Call backend to generate
      await PDFService.ExportInvoicePDF(databasePath, inv.ID, resp.Path)
  setSuccess('PDF exported successfully.')
  toast.success('PDF exported successfully.')
      // Auto clear success after a moment
      setTimeout(() => setSuccess(null), 3000)
    } catch (e: any) {
      const msg = e?.message ?? String(e)
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [databasePath, toast])

  if (!effectiveCompanyId) {
    return <div className="text-sm text-error">No company selected</div>
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div className="grid gap-1">
          <h2 className="text-xl font-semibold heading-primary">Invoices</h2>
          <div className="flex gap-2 items-center">
            {/* Searchable Client Combobox */}
            <div className="relative" ref={clientComboRef} style={{ width: 240 }}>
              <input
                className="input"
                role="combobox"
                aria-expanded={clientOpen}
                aria-controls="client-combobox-list"
                placeholder="Filter by client"
                value={clientOpen ? clientQuery : (filterClientID ? (clientsMap.get(filterClientID) ?? '') : '')}
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
                      setFilterClientID(pick.ID)
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
                  id="client-combobox-list"
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
                      aria-selected={filterClientID === c.ID}
                      className={`px-2 py-1 cursor-pointer rounded ${idx === clientHighlight ? 'bg-white/10' : 'hover:bg-white/5'}`}
                      onMouseEnter={() => setClientHighlight(idx)}
                      onMouseDown={(e) => { e.preventDefault() }}
                      onClick={() => {
                        setFilterClientID(c.ID)
                        setClientQuery('')
                        setClientOpen(false)
                      }}
                    >
                      {c.Name}
                    </div>
                  ))}
                  {(() => {
                    const totalActual = Math.max(filteredClients.length - 1, 0) // exclude 'All clients'
                    const visibleActual = Math.min(Math.max(visibleClients.length - 1, 0), totalActual)
                    return totalActual > visibleActual ? (
                      <div className="px-2 py-2 text-xs text-muted">Showing {visibleActual} of {totalActual} — keep typing to narrow</div>
                    ) : null
                  })()}
                </div>
              )}
            </div>
            {/* Searchable Fiscal Year Combobox */}
            <div className="relative" ref={fyComboRef} style={{ width: 180 }}>
              <input
                className="input"
                role="combobox"
                aria-expanded={fyOpen}
                aria-controls="fy-combobox-list"
                placeholder="Fiscal year"
                value={fyOpen ? fyQuery : (filterFiscalYear === '' ? 'All years' : String(filterFiscalYear))}
                onFocus={() => { setFyOpen(true); setFyHighlight(0) }}
                onChange={(e) => { setFyQuery(e.target.value); setFyOpen(true); setFyHighlight(0) }}
                onKeyDown={(e) => {
                  const options = (() => {
                    const q = fyQuery.trim()
                    const base = q ? fiscalYears.filter(y => String(y).includes(q)) : fiscalYears
                    const arr = [{ value: '' as const, label: 'All years' as const }, ...base.map(y => ({ value: y, label: String(y) }))]
                    return arr
                  })()
                  if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    setFyOpen(true)
                    setFyHighlight((i) => Math.min(i + 1, Math.max(options.length - 1, 0)))
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    setFyOpen(true)
                    setFyHighlight((i) => Math.max(i - 1, 0))
                  } else if (e.key === 'Enter') {
                    e.preventDefault()
                    const pick = options[fyHighlight]
                    if (pick) {
                      setFilterFiscalYear(pick.value === '' ? '' : Number(pick.value))
                      setFyQuery('')
                      setFyOpen(false)
                    }
                  } else if (e.key === 'Escape') {
                    e.preventDefault()
                    setFyOpen(false)
                  }
                }}
              />
              {fyOpen && (
                <div
                  id="fy-combobox-list"
                  role="listbox"
                  className="absolute z-50 mt-1 w-full card card-solid max-h-64 overflow-auto"
                >
                  {(() => {
                    const q = fyQuery.trim()
                    const base = q ? fiscalYears.filter(y => String(y).includes(q)) : fiscalYears
                    const options = [{ value: '' as const, label: 'All years' }, ...base.map(y => ({ value: y, label: String(y) }))]
                    const MAX_FY_OPTIONS = 7
                    const visible = options.slice(0, MAX_FY_OPTIONS)
                    return (
                      <>
                        {visible.length === 0 && (
                          <div className="px-2 py-2 text-sm text-muted">No results</div>
                        )}
                        {visible.map((opt, idx) => (
                          <div
                            key={`${opt.label}-${idx}`}
                            role="option"
                            aria-selected={(filterFiscalYear === '' && opt.value === '') || (typeof opt.value === 'number' && filterFiscalYear === opt.value)}
                            className={`px-2 py-1 cursor-pointer rounded ${idx === fyHighlight ? 'bg-white/10' : 'hover:bg-white/5'}`}
                            onMouseEnter={() => setFyHighlight(idx)}
                            onMouseDown={(e) => { e.preventDefault() }}
                            onClick={() => {
                              setFilterFiscalYear(opt.value === '' ? '' : Number(opt.value))
                              setFyQuery('')
                              setFyOpen(false)
                            }}
                          >
                            {opt.label}
                          </div>
                        ))}
                        {options.length > visible.length && (
                          <div className="px-2 py-2 text-xs text-muted">Showing {visible.length} of {options.length} — type to search</div>
                        )}
                      </>
                    )
                  })()}
                </div>
              )}
            </div>
            <button className="btn btn-secondary" onClick={() => { void loadInvoices() }}>Apply</button>
          </div>
        </div>
  {/* New invoice button removed; use FAB instead */}
      </div>

      {loading && <div className="text-sm text-muted">Loading…</div>}
  {error && <div className="text-sm text-error">Error: {error}</div>}
  {success && <div className="text-sm text-success">{success}</div>}

      {invoices.length === 0 ? (
        <div className="text-sm text-muted">No invoices found for the selected filters.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted">
                <th className="py-2 pr-3">Number</th>
                <th className="py-2 pr-3">Client</th>
                <th className="py-2 pr-3">Fiscal Year</th>
                <th className="py-2 pr-3">Issue</th>
                <th className="py-2 pr-3">Due</th>
                <th className="py-2 pr-3">Currency</th>
                <th className="py-2 pr-3">Total</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv: any) => (
                <tr key={inv.ID} className="border-t" style={{ borderColor: 'var(--color-surface-border)' }}>
                  <td className="py-2 pr-3">{String(inv.Number ?? '')}</td>
                  <td className="py-2 pr-3">{clientsMap.get(inv.ClientID) ?? inv.ClientID}</td>
                  <td className="py-2 pr-3">{inv.FiscalYear ?? '—'}</td>
                  <td className="py-2 pr-3">{inv.IssueDate}</td>
                  <td className="py-2 pr-3">{inv.DueDate}</td>
                  <td className="py-2 pr-3">{inv.Currency}</td>
                  <td className="py-2 pr-3">{inv.Total?.toFixed ? inv.Total.toFixed(2) : inv.Total}</td>
                  <td className="py-2 pr-3">{inv.Status}</td>
                  <td className="py-2 pr-3">
                    <div className="flex gap-2">
                      <button
                        className="icon-btn"
                        aria-label="Export invoice PDF"
                        title="Export PDF"
                        onClick={() => void exportPDF(inv)}
                      >
                        <FontAwesomeIcon icon={faFilePdf} />
                      </button>
                      <button
                        className="icon-btn"
                        aria-label="Edit invoice"
                        title="Edit"
                        onClick={() => void openEdit(inv.ID)}
                      >
                        <FontAwesomeIcon icon={faPen} />
                      </button>
                      <button
                        className="icon-btn"
                        aria-label="Delete invoice"
                        title="Delete"
                        onClick={() => void remove(inv.ID)}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && draft && (
        <InvoiceEditorModal
          isOpen={showModal}
          clients={clients}
          initialDraft={draft}
          editingId={editingId}
          loading={loading}
          onClose={closeModal}
          onSubmit={submit}
        />
      )}

      {/* Floating action button to open invoice modal */}
      <button className="fab" aria-label="Create invoice" onClick={() => void openCreate()}>+</button>
    </div>
  )
}
