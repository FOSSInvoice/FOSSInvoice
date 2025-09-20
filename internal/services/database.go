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
