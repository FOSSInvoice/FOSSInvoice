package services

import (
	"bytes"
	"encoding/base64"
	"path/filepath"
	"strings"

	appdb "github.com/fossinvoice/fossinvoice/internal/db"
	"github.com/fossinvoice/fossinvoice/internal/models"
	"github.com/go-pdf/fpdf"
	"gorm.io/gorm"
)

type PDFService struct{}

// ExportInvoicePDF generates a PDF for the given invoice and writes it to outPath.
// It will create parent directories if necessary and ensure the file has a .pdf extension.
func (s *PDFService) ExportInvoicePDF(databasePath string, invoiceID uint, outPath string) error {
	if strings.TrimSpace(outPath) == "" {
		return gorm.ErrInvalidData
	}

	// Normalise extension
	if !strings.EqualFold(filepath.Ext(outPath), ".pdf") {
		outPath = outPath + ".pdf"
	}

	d, err := appdb.Open(databasePath)
	if err != nil {
		return err
	}
	defer d.Close()

	// Load invoice with relations
	var inv models.Invoice
	if err := d.DB.Preload("Items").Preload("Company").Preload("Client").First(&inv, invoiceID).Error; err != nil {
		return err
	}

	// Setup PDF
	pdf := fpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(15, 15, 15)
	pdf.AddPage()

	// Header: Company logo (if IconB64 present), name & address
	x0, y0 := pdf.GetXY()
	curX, curY := x0, y0

	// Try to add logo if present
	hasLogo := false
	if inv.Company.IconB64 != "" {
		if data, err := base64.StdEncoding.DecodeString(inv.Company.IconB64); err == nil {
			// Detect format (PNG/JPEG) by signature
			imgType := "PNG"
			if len(data) >= 3 {
				if data[0] == 0xFF && data[1] == 0xD8 && data[2] == 0xFF {
					imgType = "JPG"
				}
			}
			r := bytes.NewReader(data)
			opt := fpdf.ImageOptions{ImageType: imgType, ReadDpi: true}
			// Place at top-left with max height 20mm
			pdf.RegisterImageOptionsReader("company_logo", opt, r)
			pdf.ImageOptions("company_logo", curX, curY, 20, 20, false, opt, 0, "")
			hasLogo = true
		}
	}

	// Company info to the right of logo (align address & tax ID with name)
	left := curX
	if hasLogo {
		left = curX + 25 // leave space for logo only if present
	}
	pdf.SetXY(left, curY)
	pdf.SetFont("Helvetica", "B", 14)
	pdf.CellFormat(0, 7, inv.Company.Name, "", 1, "L", false, 0, "")
	pdf.SetFont("Helvetica", "", 10)
	// Compute available width starting from `left` to right margin for proper wrapping
	pageW, _ := pdf.GetPageSize()
	_, _, rMargin, _ := pdf.GetMargins()
	contentWidthFromLeft := pageW - rMargin - left
	if inv.Company.Address != "" {
		pdf.SetX(left)
		pdf.MultiCell(contentWidthFromLeft, 5, inv.Company.Address, "", "L", false)
	}
	if inv.Company.TaxID != "" {
		pdf.SetX(left)
		pdf.CellFormat(0, 5, inv.Company.TaxID, "", 1, "L", false, 0, "")
	}

	// Spacer
	pdf.Ln(5)

	// Invoice meta block (show only Invoice # and Date)
	pdf.SetFont("Helvetica", "B", 12)
	pdf.CellFormat(0, 6, "Invoice", "", 1, "L", false, 0, "")
	pdf.SetFont("Helvetica", "", 10)
	pdf.CellFormat(95, 5, "Invoice #: "+itoa(inv.Number), "", 0, "L", false, 0, "")
	pdf.CellFormat(0, 5, "Date: "+inv.IssueDate, "", 1, "L", false, 0, "")

	// Client block
	pdf.Ln(4)
	pdf.SetFont("Helvetica", "B", 11)
	pdf.CellFormat(0, 6, "Bill To", "", 1, "L", false, 0, "")
	pdf.SetFont("Helvetica", "", 10)
	pdf.CellFormat(0, 5, inv.Client.Name, "", 1, "L", false, 0, "")
	if inv.Client.Address != "" {
		pdf.MultiCell(0, 5, inv.Client.Address, "", "L", false)
	}
	if inv.Client.TaxID != "" {
		pdf.CellFormat(0, 5, inv.Client.TaxID, "", 1, "L", false, 0, "")
	}

	// Items table header
	pdf.Ln(4)
	pdf.SetFont("Helvetica", "B", 10)
	// Columns: Description, Qty, Unit, Total
	colW := []float64{95, 20, 35, 25}
	headers := []string{"Description", "Qty", "Unit", "Total"}
	for i, h := range headers {
		align := "L"
		if i > 0 {
			align = "R"
		}
		pdf.CellFormat(colW[i], 7, h, "TB", 0, align, false, 0, "")
	}
	pdf.Ln(-1)

	pdf.SetFont("Helvetica", "", 10)
	for _, it := range inv.Items {
		// Description might be long -> use MultiCell logic
		// We'll print in a simple row assuming short descriptions for now
		pdf.CellFormat(colW[0], 6, it.Description, "B", 0, "L", false, 0, "")
		pdf.CellFormat(colW[1], 6, formatFloat(it.Quantity), "B", 0, "R", false, 0, "")
		pdf.CellFormat(colW[2], 6, formatAmount(it.UnitPrice), "B", 0, "R", false, 0, "")
		pdf.CellFormat(colW[3], 6, formatAmount(it.Total), "B", 0, "R", false, 0, "")
		pdf.Ln(-1)
	}

	// Totals section
	pdf.Ln(2)
	rightX := 15 + colW[0] + colW[1] + colW[2]
	pdf.SetXY(rightX, pdf.GetY())
	pdf.CellFormat(colW[3], 6, "Subtotal: "+formatAmount(inv.Subtotal), "", 1, "R", false, 0, "")
	pdf.SetXY(rightX, pdf.GetY())
	pdf.CellFormat(colW[3], 6, "Tax ("+formatFloat(inv.TaxRate)+"%): "+formatAmount(inv.TaxAmount), "", 1, "R", false, 0, "")
	if inv.DiscountAmount > 0 {
		pdf.SetXY(rightX, pdf.GetY())
		pdf.CellFormat(colW[3], 6, "Discount: -"+formatAmount(inv.DiscountAmount), "", 1, "R", false, 0, "")
	}
	pdf.SetFont("Helvetica", "B", 11)
	pdf.SetXY(rightX, pdf.GetY())
	pdf.CellFormat(colW[3], 7, "Total: "+formatMoney(inv.Currency, inv.Total), "", 1, "R", false, 0, "")
	pdf.SetFont("Helvetica", "", 10)

	// Notes
	if inv.Notes != nil && strings.TrimSpace(*inv.Notes) != "" {
		pdf.Ln(4)
		pdf.SetFont("Helvetica", "B", 10)
		pdf.CellFormat(0, 6, "Notes", "", 1, "L", false, 0, "")
		pdf.SetFont("Helvetica", "", 10)
		pdf.MultiCell(0, 5, *inv.Notes, "", "L", false)
	}

	// Ensure directory exists
	if err := ensureDir(filepath.Dir(outPath)); err != nil {
		return err
	}

	return pdf.OutputFileAndClose(outPath)
}
