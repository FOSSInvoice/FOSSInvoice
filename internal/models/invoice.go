package models

import "gorm.io/gorm"

type Invoice struct {
	gorm.Model

	// Ownership / FKs
	CompanyID uint
	ClientID  uint
	Company   Company
	Client    Client

	// Identification & dates
	Number    int // human-readable invoice number (numeric)
	IssueDate string // ISO date (YYYY-MM-DD)
	DueDate   string // ISO date (YYYY-MM-DD)
	// Fiscal categorization
	FiscalYear int // e.g., 2025

	// Currency & amounts
	Currency       string  // ISO 4217 code, e.g. "USD", "EUR"
	Subtotal       float64 // sum of item totals before tax and discounts
	TaxRate        float64 // percentage, e.g. 21.0 for 21%
	TaxAmount      float64 // computed tax amount over the taxable base
	DiscountAmount float64 // optional absolute discount applied at invoice level
	Total          float64 // grand total after tax and discounts

	// Status & presentation
	Status string  // e.g. "Draft", "Sent", "Paid", "Overdue"
	Notes  *string // optional footer/notes to show on the PDF

	// Lines
	Items []InvoiceItem
}

type InvoiceItem struct {
	gorm.Model
	InvoiceID   uint
	Description string
	Quantity    float64 // supports fractional quantities (e.g., hours)
	UnitPrice   float64
	Total       float64 // Quantity * UnitPrice
}
