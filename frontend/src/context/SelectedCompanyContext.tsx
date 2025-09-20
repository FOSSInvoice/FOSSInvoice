import { createContext, useContext, useMemo, useState, ReactNode } from 'react'

type SelectedCompanyState = {
  selectedCompanyId: number | null
  setSelectedCompanyId: (id: number | null) => void
}

const SelectedCompanyContext = createContext<SelectedCompanyState | undefined>(undefined)

export function SelectedCompanyProvider({ children }: { children: ReactNode }) {
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null)
  const value = useMemo(() => ({ selectedCompanyId, setSelectedCompanyId }), [selectedCompanyId])
  return <SelectedCompanyContext.Provider value={value}>{children}</SelectedCompanyContext.Provider>
}

export function useSelectedCompany() {
  const ctx = useContext(SelectedCompanyContext)
  if (!ctx) throw new Error('useSelectedCompany must be used within SelectedCompanyProvider')
  return ctx
}
