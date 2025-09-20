package models

import "gorm.io/gorm"

// Company represents the seller.
type Company struct {
	gorm.Model
	Name    string
	Address string
	TaxID   string
	IconB64 string

	// Inline contact fields into the same table for simplicity
	Contact ContactInfo `gorm:"embedded"`

	// Relations
	Clients  []Client
	Invoices []Invoice
}
