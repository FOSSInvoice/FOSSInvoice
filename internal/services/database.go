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
