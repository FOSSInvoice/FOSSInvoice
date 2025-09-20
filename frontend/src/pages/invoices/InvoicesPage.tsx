import { useParams } from 'react-router-dom'
import { useSelectedCompany } from '../../context/SelectedCompanyContext'

export default function InvoicesPage() {
  const { companyId } = useParams()
  const { selectedCompanyId } = useSelectedCompany()

  return (
    <div className="grid gap-2">
      <h2 className="text-xl font-semibold">Invoices</h2>
      <div className="text-sm text-neutral-600 dark:text-neutral-300">Route companyId: {companyId}</div>
      <div className="text-sm text-neutral-600 dark:text-neutral-300">Selected company (context): {selectedCompanyId ?? 'none'}</div>
      <p className="text-sm text-neutral-500">Placeholder. Replace with Wails-bound invoice list and editing for the selected company.</p>
    </div>
  )
}
