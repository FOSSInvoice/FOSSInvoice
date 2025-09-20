package models

import "gorm.io/gorm"

// Client represents the buyer.
type Client struct {
	gorm.Model
	CompanyID uint // FK to Company

	Name    string
	Address string
	TaxID   string

	// Inline contact fields for simplicity
	Contact ContactInfo `gorm:"embedded"`

	Invoices []Invoice
}
