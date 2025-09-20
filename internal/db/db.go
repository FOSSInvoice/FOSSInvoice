package db

import (
	"log"
	"path/filepath"

	"github.com/fossinvoice/fossinvoice/internal/models"
	gormsqlite "gorm.io/driver/sqlite"
	"gorm.io/gorm"
	_ "modernc.org/sqlite"
)

// Database wraps a GORM DB instance.
type Database struct {
	DB *gorm.DB
}

// Open creates (or opens) a SQLite database at the given path, runs migrations, and returns a handle.
func Open(dbPath string) (*Database, error) {
	resolved := filepath.Clean(dbPath)
	dsn := "file:" + resolved + "?mode=rwc&_pragma=busy_timeout=5000&_pragma=journal_mode=WAL"
	gdb, err := gorm.Open(gormsqlite.Dialector{DriverName: "sqlite", DSN: dsn}, &gorm.Config{})
	if err != nil {
		return nil, err
	}

	if err := gdb.AutoMigrate(
		&models.Company{},
		&models.Client{},
		&models.Invoice{},
		&models.InvoiceItem{},
	); err != nil {
		return nil, err
	}

	log.Printf("database initialized at %s", resolved)
	return &Database{DB: gdb}, nil
}

// Close closes the underlying sql.DB.
func (d *Database) Close() error {
	if d == nil || d.DB == nil {
		return nil
	}
	sqlDB, err := d.DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}
