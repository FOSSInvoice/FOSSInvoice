import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useSelectedCompany } from '../context/SelectedCompanyContext'
import { useDatabasePath } from '../context/DatabasePathContext'
import { DatabaseService } from '../../bindings/github.com/fossinvoice/fossinvoice/internal/services'

export default function DashboardLayout() {
  const { companyId } = useParams()
  const navigate = useNavigate()
  const { selectedCompanyId, setSelectedCompanyId } = useSelectedCompany()
  const { databasePath } = useDatabasePath()
  const [companyName, setCompanyName] = useState<string | null>(null)
  const [companyIconB64, setCompanyIconB64] = useState<string | null>(null)

  useEffect(() => {
    // Sync route param to context so nested pages can use it
    if (companyId) {
      const parsed = Number(companyId)
      if (!Number.isNaN(parsed) && parsed !== selectedCompanyId) {
        setSelectedCompanyId(parsed)
      }
    }
  }, [companyId, selectedCompanyId, setSelectedCompanyId])

  useEffect(() => {
    let cancelled = false
    async function loadName() {
      if (!databasePath || !companyId) {
        if (!cancelled) setCompanyName(null)
        return
      }
      const parsed = Number(companyId)
      if (Number.isNaN(parsed)) {
        if (!cancelled) setCompanyName(null)
        return
      }
      try {
  const list = await DatabaseService.ListCompanies(databasePath)
        if (cancelled) return
        const found = list.find(c => c.ID === parsed)
        setCompanyName(found?.Name ?? null)
        // @ts-ignore - IconB64 is part of generated Company model
        setCompanyIconB64((found as any)?.IconB64 ?? null)
      } catch {
        if (!cancelled) {
          setCompanyName(null)
          setCompanyIconB64(null)
        }
      }
    }
    void loadName()
    return () => { cancelled = true }
  }, [companyId, databasePath])

  if (!companyId) {
    return (
      <div style={{ padding: 16 }}>
        <p>No company selected.</p>
        <button onClick={() => navigate('/')}>Back</button>
      </div>
    )
  }

  return (
    <div className="app-background grid grid-cols-[240px_1fr] h-screen">
      <aside
        className="border-r p-3 flex flex-col gap-3"
        style={{ backgroundColor: 'var(--color-surface-solid)', borderColor: 'var(--color-surface-border)' }}
      >
        <div className="grid grid-cols-[1fr_auto] items-center gap-3">
          <div>
            <div className="text-sm text-muted">Company</div>
            <div className="font-semibold tracking-tight">{companyName ?? companyId}</div>
          </div>
          {companyIconB64 && companyIconB64.trim() ? (
            <img
              src={`data:image/*;base64,${companyIconB64.trim()}`}
              alt={`${companyName ?? 'Company'} logo`}
              className="w-10 h-10 rounded-md object-cover"
              style={{ borderColor: 'var(--color-surface-border)' }}
            />
          ) : (
            <div
              className="w-10 h-10 rounded-md grid place-items-center border"
              style={{ background: 'var(--color-surface-solid)', color: 'var(--color-text-muted)', borderColor: 'var(--color-surface-border)' }}
              aria-label="No logo"
            >
              <img src="/camera.svg" alt="No logo" className="w-5 h-5 opacity-80" />
            </div>
          )}
        </div>
        <nav className="mt-2 grid gap-1 text-sm">
          <NavLink
            to="info"
            className={({ isActive }) => `rounded-md px-2 py-1 ${isActive ? 'bg-indigo-600 text-white' : 'hover:bg-white/5'}`}
          >
            Company Info
          </NavLink>
          <NavLink
            to="clients"
            className={({ isActive }) => `rounded-md px-2 py-1 ${isActive ? 'bg-indigo-600 text-white' : 'hover:bg-white/5'}`}
          >
            Clients
          </NavLink>
          <NavLink
            to="invoices"
            className={({ isActive }) => `rounded-md px-2 py-1 ${isActive ? 'bg-indigo-600 text-white' : 'hover:bg-white/5'}`}
          >
            Invoices
          </NavLink>
        </nav>
        <div className="mt-auto">
          <button className="btn btn-primary w-full justify-center" onClick={() => navigate('/select-company')}>Switch company</button>
          {!databasePath && (
            <div className="text-xs text-error mt-2">No database selected</div>
          )}
        </div>
      </aside>
      <main className="p-4 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
