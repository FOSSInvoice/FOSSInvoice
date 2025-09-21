export type ClientLite = { ID: number; Name: string }

export type ItemDraft = {
  ID?: number
  Description: string
  Quantity: number
  UnitPrice: number
  Total: number
}

export type InvoiceDraft = {
  ID?: number
  CompanyID: number
  ClientID: number
  Number: number | ''
  FiscalYear: number | ''
  IssueDate: string
  DueDate: string
  Currency: string
  TaxRate: number
  DiscountAmount: number
  Status: string
  Notes: string
  Items: ItemDraft[]
}
