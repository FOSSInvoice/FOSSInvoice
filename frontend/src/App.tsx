import { Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage.tsx'
import CompanySelector from './pages/CompanySelector.tsx'
import DashboardLayout from './pages/DashboardLayout.tsx'
import CompanyInfo from './pages/company/CompanyInfo.tsx'
import ClientsPage from './pages/clients/ClientsPage.tsx'
import InvoicesPage from './pages/invoices/InvoicesPage.tsx'
import { SelectedCompanyProvider } from './context/SelectedCompanyContext.tsx'
import { DatabasePathProvider } from './context/DatabasePathContext.tsx'
import { ToastProvider } from './context/ToastContext.tsx'

function App() {
  return (
    <DatabasePathProvider>
      <SelectedCompanyProvider>
        <ToastProvider>
          <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/select-company" element={<CompanySelector />} />
          <Route path="/company/:companyId" element={<DashboardLayout />}>
            <Route index element={<Navigate to="info" replace />} />
            <Route path="info" element={<CompanyInfo />} />
            <Route path="clients" element={<ClientsPage />} />
            <Route path="invoices" element={<InvoicesPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </SelectedCompanyProvider>
    </DatabasePathProvider>
  )
}

export default App
