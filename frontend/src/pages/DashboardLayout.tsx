import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faAnglesLeft, faAnglesRight, faCircleInfo, faUsers, faFile } from '@fortawesome/free-solid-svg-icons'
import { useEffect, useState } from 'react'
import { useSelectedCompany } from '../context/SelectedCompanyContext'
import { useDatabasePath } from '../context/DatabasePathContext'
import { DatabaseService } from '../../bindings/github.com/fossinvoice/fossinvoice/internal/services'
import { useI18n } from '../i18n'
import LanguageSwitcher from '../components/LanguageSwitcher'

export default function DashboardLayout() {
  const { t } = useI18n()
  const { companyId } = useParams()
  const navigate = useNavigate()
  const { selectedCompanyId, setSelectedCompanyId } = useSelectedCompany()
  const { databasePath } = useDatabasePath()
  const [companyName, setCompanyName] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)

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
      } catch {
        if (!cancelled) {
          setCompanyName(null)
        }
      }
    }
    void loadName()
    return () => { cancelled = true }
  }, [companyId, databasePath])

  if (!companyId) {
    return (
      <div style={{ padding: 16 }}>
        <p>{t('messages.noCompanySelected')}</p>
        <button onClick={() => navigate('/')}>{t('common.back')}</button>
      </div>
    )
  }

  return (
    <div
      className="app-background grid h-screen"
      style={{ gridTemplateColumns: collapsed ? '56px 1fr' : '180px 1fr' }}
    >
      <aside
        className="border-r p-3 flex flex-col gap-3"
        style={{ backgroundColor: 'var(--color-surface-solid)', borderColor: 'var(--color-surface-border)' }}
      >
        {/* Header row: Back button (left) and company name (right) */}
        <div className="flex items-center justify-between gap-3">
          <button
            className="icon-btn"
            onClick={() => { setSelectedCompanyId(null); navigate('/select-company') }}
            aria-label={t('common.back')}
            title={t('common.back')}
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
          {!collapsed && (
            <div className="font-semibold tracking-tight truncate">{companyName ?? companyId}</div>
          )}
        </div>
        {collapsed ? (
          <nav className="mt-2 grid gap-1 text-sm">
            <NavLink
              to="info"
              title={t('common.companyInfo')}
              aria-label={t('common.companyInfo')}
              className={({ isActive }) => `rounded-md grid place-items-center h-9 ${isActive ? 'bg-indigo-600 text-white' : 'hover:bg-white/5'}`}
            >
              <FontAwesomeIcon icon={faCircleInfo} />
            </NavLink>
            <NavLink
              to="clients"
              title={t('common.clients')}
              aria-label={t('common.clients')}
              className={({ isActive }) => `rounded-md grid place-items-center h-9 ${isActive ? 'bg-indigo-600 text-white' : 'hover:bg-white/5'}`}
            >
              <FontAwesomeIcon icon={faUsers} />
            </NavLink>
            <NavLink
              to="invoices"
              title={t('common.invoices')}
              aria-label={t('common.invoices')}
              className={({ isActive }) => `rounded-md grid place-items-center h-9 ${isActive ? 'bg-indigo-600 text-white' : 'hover:bg-white/5'}`}
            >
              <FontAwesomeIcon icon={faFile} />
            </NavLink>
          </nav>
        ) : (
          <nav className="mt-2 grid gap-1 text-sm">
            <NavLink
              to="info"
              className={({ isActive }) => `rounded-md px-2 py-1 ${isActive ? 'bg-indigo-600 text-white' : 'hover:bg-white/5'}`}
            >
              <span className="inline-flex items-center gap-2">
                <FontAwesomeIcon icon={faCircleInfo} fixedWidth />
                {t('common.companyInfo')}
              </span>
            </NavLink>
            <NavLink
              to="clients"
              className={({ isActive }) => `rounded-md px-2 py-1 ${isActive ? 'bg-indigo-600 text-white' : 'hover:bg-white/5'}`}
            >
              <span className="inline-flex items-center gap-2">
                <FontAwesomeIcon icon={faUsers} fixedWidth />
                {t('common.clients')}
              </span>
            </NavLink>
            <NavLink
              to="invoices"
              className={({ isActive }) => `rounded-md px-2 py-1 ${isActive ? 'bg-indigo-600 text-white' : 'hover:bg-white/5'}`}
            >
              <span className="inline-flex items-center gap-2">
                <FontAwesomeIcon icon={faFile} fixedWidth />
                {t('common.invoices')}
              </span>
            </NavLink>
          </nav>
        )}
        <div className="mt-auto">
          {!collapsed && (
            <div className="mb-2 flex justify-end">
              <LanguageSwitcher />
            </div>
          )}
          <button
            className="icon-btn w-full justify-center"
            onClick={() => setCollapsed(c => !c)}
            aria-label={collapsed ? t('common.expandSidebar') : t('common.collapseSidebar')}
            title={collapsed ? t('common.expandSidebar') : t('common.collapseSidebar')}
          >
            <FontAwesomeIcon icon={collapsed ? faAnglesRight : faAnglesLeft} />
          </button>
          
          {!databasePath && (
            <div className="text-xs text-error mt-2">{t('messages.noDatabaseSelected')}</div>
          )}
        </div>
      </aside>
      <main className="p-4 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
