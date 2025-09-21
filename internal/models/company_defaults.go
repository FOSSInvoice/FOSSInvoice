package models

import "gorm.io/gorm"

// CompanyDefaults stores default configuration for a company (one-to-one).
type CompanyDefaults struct {
    gorm.Model
    CompanyID       uint   `gorm:"uniqueIndex"`
    Company         Company
    DefaultCurrency string  // ISO 4217 code e.g. "USD", "EUR"
    DefaultTaxRate  float64 // percentage, e.g., 21.0
}
