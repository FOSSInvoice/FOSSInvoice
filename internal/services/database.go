package services

import (
	appdb "github.com/fossinvoice/fossinvoice/internal/db"
	"github.com/fossinvoice/fossinvoice/internal/models"
	"gorm.io/gorm"
)

// DatabaseService provides simple CRUD methods operating on a SQLite DB file path.
// Each method opens the database at the provided path, performs the operation, and closes it.
type DatabaseService struct{}

func (s *DatabaseService) Init(databasePath string) error {
	d, err := appdb.Open(databasePath)
	if err != nil {
		return err
	}
	defer d.Close()

	return d.DB.Exec("SELECT 1").Error
}

// ListCompanies returns all companies.
func (s *DatabaseService) ListCompanies(databasePath string) ([]models.Company, error) {
	d, err := appdb.Open(databasePath)
	if err != nil {
		return nil, err
	}
	defer d.Close()

	var companies []models.Company
	if err := d.DB.Find(&companies).Error; err != nil {
		return nil, err
	}
	return companies, nil
}

// CompaniesPage represents a paginated result of companies.
type CompaniesPage struct {
	Items []models.Company `json:"items"`
	Total int64            `json:"total"`
}

// ListCompaniesPaged returns companies with limit/offset and a total count for pagination.
func (s *DatabaseService) ListCompaniesPaged(databasePath string, limit, offset int) (*CompaniesPage, error) {
	d, err := appdb.Open(databasePath)
	if err != nil {
		return nil, err
	}
	defer d.Close()

	var total int64
	if err := d.DB.Model(&models.Company{}).Count(&total).Error; err != nil {
		return nil, err
	}

	var items []models.Company
	q := d.DB.Model(&models.Company{})
	if limit > 0 {
		q = q.Limit(limit).Offset(offset)
	}
	if err := q.Order("created_at DESC").Find(&items).Error; err != nil {
		return nil, err
	}
	return &CompaniesPage{Items: items, Total: total}, nil
}

// CreateCompany inserts a new company (data only, no relations) and returns it with the assigned ID.
func (s *DatabaseService) CreateCompany(databasePath string, company models.Company) (*models.Company, error) {
	d, err := appdb.Open(databasePath)
	if err != nil {
		return nil, err
	}
	defer d.Close()

	if err := d.DB.Create(&company).Error; err != nil {
		return nil, err
	}
	return &company, nil
}

// UpdateCompany updates company data by primary key (ID must be set). Returns the updated record.
func (s *DatabaseService) UpdateCompany(databasePath string, company models.Company) (*models.Company, error) {
	d, err := appdb.Open(databasePath)
	if err != nil {
		return nil, err
	}
	defer d.Close()

	if company.ID == 0 {
		return nil, gorm.ErrMissingWhereClause // indicates missing primary key
	}

	// Save updates all fields; suitable here since we want a simple data update (no relations).
	if err := d.DB.Save(&company).Error; err != nil {
		return nil, err
	}
	return &company, nil
}

// DeleteCompany deletes a company and its related data (clients, invoices, invoice items) in a transaction.
func (s *DatabaseService) DeleteCompany(databasePath string, companyID uint) error {
	d, err := appdb.Open(databasePath)
	if err != nil {
		return err
	}
	defer d.Close()

	return d.DB.Transaction(func(tx *gorm.DB) error {
		// Delete invoice items for all invoices belonging to the company
		subInvoices := tx.Model(&models.Invoice{}).Select("id").Where("company_id = ?", companyID)
		if err := tx.Where("invoice_id IN (?)", subInvoices).Delete(&models.InvoiceItem{}).Error; err != nil {
			return err
		}

		// Delete invoices for the company
		if err := tx.Where("company_id = ?", companyID).Delete(&models.Invoice{}).Error; err != nil {
			return err
		}

		// Delete clients for the company
		if err := tx.Where("company_id = ?", companyID).Delete(&models.Client{}).Error; err != nil {
			return err
		}

		// Finally delete the company
		if err := tx.Where("id = ?", companyID).Delete(&models.Company{}).Error; err != nil {
			return err
		}
		return nil
	})
}

// ListClients returns all clients for a given company.
func (s *DatabaseService) ListClients(databasePath string, companyID uint) ([]models.Client, error) {
	d, err := appdb.Open(databasePath)
	if err != nil {
		return nil, err
	}
	defer d.Close()

	var clients []models.Client
	if err := d.DB.Where("company_id = ?", companyID).Find(&clients).Error; err != nil {
		return nil, err
	}
	return clients, nil
}

// ClientsPage represents a paginated result of clients.
type ClientsPage struct {
	Items []models.Client `json:"items"`
	Total int64           `json:"total"`
}

// ListClientsPaged returns clients for a company with limit/offset and total count.
func (s *DatabaseService) ListClientsPaged(databasePath string, companyID uint, limit, offset int) (*ClientsPage, error) {
	d, err := appdb.Open(databasePath)
	if err != nil {
		return nil, err
	}
	defer d.Close()

	base := d.DB.Model(&models.Client{}).Where("company_id = ?", companyID)
	var total int64
	if err := base.Count(&total).Error; err != nil {
		return nil, err
	}
	var items []models.Client
	q := base
	if limit > 0 {
		q = q.Limit(limit).Offset(offset)
	}
	if err := q.Order("created_at DESC").Find(&items).Error; err != nil {
		return nil, err
	}
	return &ClientsPage{Items: items, Total: total}, nil
}

// GetClient returns a single client by ID.
func (s *DatabaseService) GetClient(databasePath string, clientID uint) (*models.Client, error) {
	d, err := appdb.Open(databasePath)
	if err != nil {
		return nil, err
	}
	defer d.Close()

	var client models.Client
	if err := d.DB.First(&client, clientID).Error; err != nil {
		return nil, err
	}
	return &client, nil
}

// CreateClient inserts a new client linked to the provided company and returns it with the assigned ID.
func (s *DatabaseService) CreateClient(databasePath string, companyID uint, client models.Client) (*models.Client, error) {
	d, err := appdb.Open(databasePath)
	if err != nil {
		return nil, err
	}
	defer d.Close()

	client.CompanyID = companyID
	if err := d.DB.Create(&client).Error; err != nil {
		return nil, err
	}
	return &client, nil
}

// UpdateClient updates client data by primary key (ID must be set). Returns the updated record.
func (s *DatabaseService) UpdateClient(databasePath string, client models.Client) (*models.Client, error) {
	d, err := appdb.Open(databasePath)
	if err != nil {
		return nil, err
	}
	defer d.Close()

	if client.ID == 0 {
		return nil, gorm.ErrMissingWhereClause
	}

	if err := d.DB.Save(&client).Error; err != nil {
		return nil, err
	}
	return &client, nil
}

// DeleteClient deletes a client and its related data (invoices and invoice items) in a transaction.
func (s *DatabaseService) DeleteClient(databasePath string, clientID uint) error {
	d, err := appdb.Open(databasePath)
	if err != nil {
		return err
	}
	defer d.Close()

	return d.DB.Transaction(func(tx *gorm.DB) error {
		// Delete invoice items for all invoices belonging to the client
		subInvoices := tx.Model(&models.Invoice{}).Select("id").Where("client_id = ?", clientID)
		if err := tx.Where("invoice_id IN (?)", subInvoices).Delete(&models.InvoiceItem{}).Error; err != nil {
			return err
		}

		// Delete invoices for the client
		if err := tx.Where("client_id = ?", clientID).Delete(&models.Invoice{}).Error; err != nil {
			return err
		}

		// Finally delete the client
		if err := tx.Where("id = ?", clientID).Delete(&models.Client{}).Error; err != nil {
			return err
		}
		return nil
	})
}

// ==============================
// Invoices CRUD
// ==============================

// ListInvoices returns invoices for a company with optional filters.
// If fiscalYear > 0, filters by FiscalYear. If clientID > 0, filters by ClientID.
func (s *DatabaseService) ListInvoices(databasePath string, companyID uint, fiscalYear int, clientID uint) ([]models.Invoice, error) {
	d, err := appdb.Open(databasePath)
	if err != nil {
		return nil, err
	}
	defer d.Close()

	var invoices []models.Invoice
	q := d.DB.Where("company_id = ?", companyID)
	if fiscalYear > 0 {
		q = q.Where("fiscal_year = ?", fiscalYear)
	}
	if clientID > 0 {
		q = q.Where("client_id = ?", clientID)
	}
	if err := q.Order("created_at DESC").Find(&invoices).Error; err != nil {
		return nil, err
	}
	return invoices, nil
}

// InvoicesPage represents a paginated result of invoices.
type InvoicesPage struct {
	Items []models.Invoice `json:"items"`
	Total int64            `json:"total"`
}

// ListInvoicesPaged returns invoices for a company with optional filters and pagination.
// If fiscalYear > 0, filters by FiscalYear. If clientID > 0, filters by ClientID.
func (s *DatabaseService) ListInvoicesPaged(databasePath string, companyID uint, fiscalYear int, clientID uint, limit, offset int) (*InvoicesPage, error) {
	d, err := appdb.Open(databasePath)
	if err != nil {
		return nil, err
	}
	defer d.Close()

	base := d.DB.Model(&models.Invoice{}).Where("company_id = ?", companyID)
	if fiscalYear > 0 {
		base = base.Where("fiscal_year = ?", fiscalYear)
	}
	if clientID > 0 {
		base = base.Where("client_id = ?", clientID)
	}

	var total int64
	if err := base.Count(&total).Error; err != nil {
		return nil, err
	}

	var items []models.Invoice
	q := base.Order("created_at DESC")
	if limit > 0 {
		q = q.Limit(limit).Offset(offset)
	}
	if err := q.Find(&items).Error; err != nil {
		return nil, err
	}
	return &InvoicesPage{Items: items, Total: total}, nil
}

// ListClientInvoices returns invoices for a company and specific client with optional fiscal year filter.
func (s *DatabaseService) ListClientInvoices(databasePath string, companyID, clientID uint, fiscalYear int) ([]models.Invoice, error) {
	d, err := appdb.Open(databasePath)
	if err != nil {
		return nil, err
	}
	defer d.Close()

	var invoices []models.Invoice
	q := d.DB.Where("company_id = ? AND client_id = ?", companyID, clientID)
	if fiscalYear > 0 {
		q = q.Where("fiscal_year = ?", fiscalYear)
	}
	if err := q.Order("created_at DESC").Find(&invoices).Error; err != nil {
		return nil, err
	}
	return invoices, nil
}

// GetInvoice returns a single invoice with its items preloaded.
func (s *DatabaseService) GetInvoice(databasePath string, invoiceID uint) (*models.Invoice, error) {
	d, err := appdb.Open(databasePath)
	if err != nil {
		return nil, err
	}
	defer d.Close()

	var inv models.Invoice
	if err := d.DB.Preload("Items").First(&inv, invoiceID).Error; err != nil {
		return nil, err
	}
	return &inv, nil
}

// CreateInvoice inserts a new invoice (and its items) ensuring the client belongs to the company.
func (s *DatabaseService) CreateInvoice(databasePath string, invoice models.Invoice) (*models.Invoice, error) {
	d, err := appdb.Open(databasePath)
	if err != nil {
		return nil, err
	}
	defer d.Close()

	// Validate that the client belongs to the given company
	var client models.Client
	if err := d.DB.First(&client, invoice.ClientID).Error; err != nil {
		return nil, err
	}
	if client.CompanyID != invoice.CompanyID {
		return nil, gorm.ErrInvalidData
	}

	// Use a transaction to create invoice and its items
	err = d.DB.Transaction(func(tx *gorm.DB) error {
		// detach items for manual insert after invoice ID is known
		items := invoice.Items
		invoice.Items = nil
		if err := tx.Create(&invoice).Error; err != nil {
			return err
		}
		if len(items) > 0 {
			for i := range items {
				items[i].InvoiceID = invoice.ID
			}
			if err := tx.Create(&items).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return &invoice, nil
}

// UpdateInvoice updates invoice header fields and replaces items with provided ones (idempotent) in a transaction.
func (s *DatabaseService) UpdateInvoice(databasePath string, invoice models.Invoice) (*models.Invoice, error) {
	d, err := appdb.Open(databasePath)
	if err != nil {
		return nil, err
	}
	defer d.Close()

	if invoice.ID == 0 {
		return nil, gorm.ErrMissingWhereClause
	}

	// Validate client belongs to company if both provided
	if invoice.ClientID != 0 {
		var client models.Client
		if err := d.DB.First(&client, invoice.ClientID).Error; err != nil {
			return nil, err
		}
		if client.CompanyID != invoice.CompanyID {
			return nil, gorm.ErrInvalidData
		}
	}

	err = d.DB.Transaction(func(tx *gorm.DB) error {
		// 1) Update invoice header (avoid association saves)
		if err := tx.Model(&models.Invoice{}).Where("id = ?", invoice.ID).Updates(map[string]any{
			"company_id":      invoice.CompanyID,
			"client_id":       invoice.ClientID,
			"number":          invoice.Number,
			"fiscal_year":     invoice.FiscalYear,
			"issue_date":      invoice.IssueDate,
			"due_date":        invoice.DueDate,
			"currency":        invoice.Currency,
			"subtotal":        invoice.Subtotal,
			"tax_rate":        invoice.TaxRate,
			"tax_amount":      invoice.TaxAmount,
			"discount_amount": invoice.DiscountAmount,
			"total":           invoice.Total,
			"status":          invoice.Status,
			"notes":           invoice.Notes,
			"footer_text":     invoice.FooterText,
		}).Error; err != nil {
			return err
		}

		// 2) Sync items: update by ID, create new (ID==0), delete removed
		// Load existing items for this invoice
		var existing []models.InvoiceItem
		if err := tx.Where("invoice_id = ?", invoice.ID).Find(&existing).Error; err != nil {
			return err
		}
		existingMap := make(map[uint]struct{}, len(existing))
		for _, it := range existing {
			existingMap[it.ID] = struct{}{}
		}

		// Track IDs we keep (present in payload after updates/creates)
		keep := make(map[uint]struct{})

		for _, it := range invoice.Items {
			if it.ID == 0 {
				// New item
				ni := models.InvoiceItem{
					InvoiceID:   invoice.ID,
					Description: it.Description,
					Quantity:    it.Quantity,
					UnitPrice:   it.UnitPrice,
					Total:       it.Total,
				}
				if err := tx.Create(&ni).Error; err != nil {
					return err
				}
				keep[ni.ID] = struct{}{}
			} else {
				// Update only if it belongs to this invoice
				if err := tx.Model(&models.InvoiceItem{}).
					Where("id = ? AND invoice_id = ?", it.ID, invoice.ID).
					Updates(map[string]any{
						"description": it.Description,
						"quantity":    it.Quantity,
						"unit_price":  it.UnitPrice,
						"total":       it.Total,
					}).Error; err != nil {
					return err
				}
				keep[it.ID] = struct{}{}
			}
		}

		// Delete items no longer present
		for id := range existingMap {
			if _, ok := keep[id]; !ok {
				if err := tx.Where("id = ? AND invoice_id = ?", id, invoice.ID).Delete(&models.InvoiceItem{}).Error; err != nil {
					return err
				}
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return &invoice, nil
}

// DeleteInvoice deletes an invoice and its items in a transaction.
func (s *DatabaseService) DeleteInvoice(databasePath string, invoiceID uint) error {
	d, err := appdb.Open(databasePath)
	if err != nil {
		return err
	}
	defer d.Close()

	return d.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("invoice_id = ?", invoiceID).Delete(&models.InvoiceItem{}).Error; err != nil {
			return err
		}
		if err := tx.Where("id = ?", invoiceID).Delete(&models.Invoice{}).Error; err != nil {
			return err
		}
		return nil
	})
}

// ListFiscalYears returns the distinct list of fiscal years present in invoices for a company (descending).
func (s *DatabaseService) ListFiscalYears(databasePath string, companyID uint) ([]int, error) {
	d, err := appdb.Open(databasePath)
	if err != nil {
		return nil, err
	}
	defer d.Close()

	var years []int
	if err := d.DB.Model(&models.Invoice{}).
		Distinct().
		Where("company_id = ? AND fiscal_year > 0", companyID).
		Order("fiscal_year DESC").
		Pluck("fiscal_year", &years).Error; err != nil {
		return nil, err
	}
	return years, nil
}

// ==============================
// Company Defaults CRUD
// ==============================

// GetCompanyDefaults returns the defaults for a company or creates an empty record if missing.
func (s *DatabaseService) GetCompanyDefaults(databasePath string, companyID uint) (*models.CompanyDefaults, error) {
	d, err := appdb.Open(databasePath)
	if err != nil {
		return nil, err
	}
	defer d.Close()

	var def models.CompanyDefaults
	err = d.DB.Where("company_id = ?", companyID).First(&def).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			def = models.CompanyDefaults{CompanyID: companyID, DefaultCurrency: "USD", DefaultTaxRate: 0, DefaultFooterText: ""}
			if err := d.DB.Create(&def).Error; err != nil {
				return nil, err
			}
		} else {
			return nil, err
		}
	}
	return &def, nil
}

// UpdateCompanyDefaults upserts defaults for a company.
func (s *DatabaseService) UpdateCompanyDefaults(databasePath string, def models.CompanyDefaults) (*models.CompanyDefaults, error) {
	d, err := appdb.Open(databasePath)
	if err != nil {
		return nil, err
	}
	defer d.Close()

	if def.CompanyID == 0 {
		return nil, gorm.ErrMissingWhereClause
	}

	var existing models.CompanyDefaults
	err = d.DB.Where("company_id = ?", def.CompanyID).First(&existing).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			if err := d.DB.Create(&def).Error; err != nil {
				return nil, err
			}
			return &def, nil
		}
		return nil, err
	}

	existing.DefaultCurrency = def.DefaultCurrency
	existing.DefaultTaxRate = def.DefaultTaxRate
	existing.DefaultFooterText = def.DefaultFooterText
	if err := d.DB.Save(&existing).Error; err != nil {
		return nil, err
	}
	return &existing, nil
}

// GetMaxInvoiceNumber returns the largest numeric invoice number for a company.
// It considers only invoice numbers that are purely numeric (e.g., "1", "42").
// If no numeric invoice numbers exist, it returns 0.
func (s *DatabaseService) GetMaxInvoiceNumber(databasePath string, companyID uint) (int, error) {
	d, err := appdb.Open(databasePath)
	if err != nil {
		return 0, err
	}
	defer d.Close()

	var inv models.Invoice
	if err := d.DB.Where("company_id = ?", companyID).Order("number DESC").First(&inv).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return 0, nil
		}
		return 0, err
	}
	return inv.Number, nil
}
