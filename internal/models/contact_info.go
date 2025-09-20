package models

// ContactInfo is embedded into Company and Client tables.
type ContactInfo struct {
	Email   *string
	Phone   *string
	Website *string
}
