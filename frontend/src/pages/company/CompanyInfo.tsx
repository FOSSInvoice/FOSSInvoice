import { useParams } from 'react-router-dom'
import { useSelectedCompany } from '../../context/SelectedCompanyContext'

export default function CompanyInfo() {
  const { companyId } = useParams()
  const { selectedCompanyId } = useSelectedCompany()

  return (
    <div className="grid gap-3">
      <h2 className="text-xl font-semibold">Company Info</h2>
      <div className="text-sm text-neutral-600 dark:text-neutral-300">Route companyId: {companyId}</div>
      <div className="text-sm text-neutral-600 dark:text-neutral-300">Selected company (context): {selectedCompanyId ?? 'none'}</div>
      <p className="text-sm text-neutral-500">This is a placeholder. Replace with fields bound to Wails-generated methods to fetch and update company data.</p>
    </div>
  )
}
