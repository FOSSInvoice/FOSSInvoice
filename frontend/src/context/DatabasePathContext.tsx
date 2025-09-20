import { createContext, useContext, useMemo, useState, ReactNode } from 'react'

type DatabasePathState = {
  databasePath: string | null
  setDatabasePath: (path: string | null) => void
}

const DatabasePathContext = createContext<DatabasePathState | undefined>(undefined)

export function DatabasePathProvider({ children }: { children: ReactNode }) {
  const [databasePath, setDatabasePath] = useState<string | null>(null)
  const value = useMemo(() => ({ databasePath, setDatabasePath }), [databasePath])
  return <DatabasePathContext.Provider value={value}>{children}</DatabasePathContext.Provider>
}

export function useDatabasePath() {
  const ctx = useContext(DatabasePathContext)
  if (!ctx) throw new Error('useDatabasePath must be used within DatabasePathProvider')
  return ctx
}
