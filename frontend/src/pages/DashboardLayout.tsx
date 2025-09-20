import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom'
import { useEffect } from 'react'
import { useSelectedCompany } from '../context/SelectedCompanyContext'
import { useDatabasePath } from '../context/DatabasePathContext'

export default function DashboardLayout() {
  const { companyId } = useParams()
  const navigate = useNavigate()
  const { selectedCompanyId, setSelectedCompanyId } = useSelectedCompany()
  const { databasePath } = useDatabasePath()

  useEffect(() => {
    // Sync route param to context so nested pages can use it
    if (companyId) {
      const parsed = Number(companyId)
      if (!Number.isNaN(parsed) && parsed !== selectedCompanyId) {
        setSelectedCompanyId(parsed)
      }
    }
  }, [companyId, selectedCompanyId, setSelectedCompanyId])

  if (!companyId) {
    return (
      <div style={{ padding: 16 }}>
        <p>No company selected.</p>
        <button onClick={() => navigate('/')}>Back</button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[240px_1fr] h-screen">
      <aside className="bg-white dark:bg-neutral-900/60 border-r border-neutral-200 dark:border-neutral-800 p-3 flex flex-col gap-3">
        <div className="text-sm text-neutral-600 dark:text-neutral-300">Company</div>
        <div className="font-semibold tracking-tight">{companyId}</div>
        <nav className="mt-2 grid gap-1 text-sm">
          <NavLink to="info" className={({ isActive }) => `rounded-md px-2 py-1 ${isActive ? 'bg-indigo-600 text-white' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}>Company Info</NavLink>
          <NavLink to="clients" className={({ isActive }) => `rounded-md px-2 py-1 ${isActive ? 'bg-indigo-600 text-white' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}>Clients</NavLink>
          <NavLink to="invoices" className={({ isActive }) => `rounded-md px-2 py-1 ${isActive ? 'bg-indigo-600 text-white' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}>Invoices</NavLink>
        </nav>
        <div className="mt-auto">
          <button className="inline-flex items-center justify-center w-full rounded-lg bg-neutral-200 px-4 py-2 text-neutral-900 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-white dark:hover:bg-neutral-600" onClick={() => navigate('/select-company')}>Switch company</button>
          {!databasePath && (
            <div className="text-xs text-red-600 mt-2">No database selected</div>
          )}
        </div>
      </aside>
      <main className="p-4 overflow-auto bg-neutral-50 dark:bg-neutral-900">
        <Outlet />
      </main>
    </div>
  )
}
