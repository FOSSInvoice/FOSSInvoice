package services

import (
	"bytes"
	"encoding/base64"
	"path/filepath"
	"strings"

	appdb "github.com/fossinvoice/fossinvoice/internal/db"
	"github.com/fossinvoice/fossinvoice/internal/i18n"
	"github.com/fossinvoice/fossinvoice/internal/models"
	"github.com/go-pdf/fpdf"
	"gorm.io/gorm"
)

type PDFService struct{}

// ExportInvoicePDF generates a PDF for the given invoice and writes it to outPath.
// It will create parent directories if necessary and ensure the file has a .pdf extension.
// ExportInvoicePDF generates a PDF for the given invoice and writes it to outPath.
// lang is a BCP47 language tag (e.g., "en", "es-ES"). If empty, defaults to English.
func (s *PDFService) ExportInvoicePDF(databasePath string, invoiceID uint, outPath string, lang string) error {
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

	// Ensure Unicode characters (e.g., é) render with core fonts like Helvetica
	utf8 := pdf.UnicodeTranslatorFromDescriptor("")

	// i18n translator
	if strings.TrimSpace(lang) == "" {
		if cfg, err := loadConfig(); err == nil && strings.TrimSpace(cfg.Language) != "" {
			lang = cfg.Language
		}
	}
	tr := i18n.T(lang)

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

	// Company info to the right of logo (two columns)
	left := curX
	if hasLogo {
		left = curX + 25 // leave space for logo only if present
	}
	pdf.SetXY(left, curY)
	pdf.SetFont("Helvetica", "B", 14)
	pdf.CellFormat(0, 7, utf8(inv.Company.Name), "", 1, "L", false, 0, "")
	pdf.SetFont("Helvetica", "", 10)
	// Compute available width starting from `left` to right margin for proper wrapping
	pageW, _ := pdf.GetPageSize()
	_, _, rMargin, _ := pdf.GetMargins()
	fullWidth := pageW - rMargin - left
	// Two columns with a small gutter
	gutter := 6.0
	infoColW := (fullWidth - gutter) / 2.0
	rightColX := left + infoColW + gutter

	// Remember starting Y after the title for both columns
	startY := pdf.GetY()

	// Left column: Address + Tax ID
	pdf.SetXY(left, startY)
	if inv.Company.Address != "" {
		pdf.MultiCell(infoColW, 5, utf8(inv.Company.Address), "", "L", false)
	}
	if inv.Company.TaxID != "" {
		pdf.SetX(left)
		pdf.CellFormat(infoColW, 5, utf8(tr("pdf.taxID")+": "+inv.Company.TaxID), "", 1, "L", false, 0, "")
	}
	leftColEndY := pdf.GetY()

	// Right column: Email, Phone, Website
	pdf.SetXY(rightColX, startY)
	if inv.Company.Contact.Email != nil && strings.TrimSpace(*inv.Company.Contact.Email) != "" {
		pdf.SetX(rightColX)
		pdf.CellFormat(infoColW, 5, utf8(tr("pdf.email")+": "+strings.TrimSpace(*inv.Company.Contact.Email)), "", 1, "L", false, 0, "")
	}
	if inv.Company.Contact.Phone != nil && strings.TrimSpace(*inv.Company.Contact.Phone) != "" {
		pdf.SetX(rightColX)
		pdf.CellFormat(infoColW, 5, utf8(tr("pdf.phone")+": "+strings.TrimSpace(*inv.Company.Contact.Phone)), "", 1, "L", false, 0, "")
	}
	if inv.Company.Contact.Website != nil && strings.TrimSpace(*inv.Company.Contact.Website) != "" {
		pdf.SetX(rightColX)
		pdf.CellFormat(infoColW, 5, utf8(tr("pdf.website")+": "+strings.TrimSpace(*inv.Company.Contact.Website)), "", 1, "L", false, 0, "")
	}
	rightColEndY := pdf.GetY()

	// Advance Y to the max of both columns
	nextY := leftColEndY
	if rightColEndY > nextY {
		nextY = rightColEndY
	}
	pdf.SetY(nextY)

	// Spacer
	pdf.Ln(5)

	// Invoice meta block (show only Invoice # and Date)
	pdf.SetFont("Helvetica", "B", 12)
	pdf.CellFormat(0, 6, utf8(tr("pdf.invoice")), "", 1, "L", false, 0, "")
	pdf.SetFont("Helvetica", "", 10)
	pdf.CellFormat(95, 5, utf8(tr("pdf.invoiceNumber")+": "+itoa(inv.Number)), "", 0, "L", false, 0, "")
	pdf.CellFormat(0, 5, utf8(tr("pdf.date")+": "+inv.IssueDate), "", 1, "L", false, 0, "")

	// Client block
	pdf.Ln(4)
	pdf.SetFont("Helvetica", "B", 11)
	pdf.CellFormat(0, 6, utf8(tr("pdf.billTo")), "", 1, "L", false, 0, "")
	pdf.SetFont("Helvetica", "", 10)
	pdf.CellFormat(0, 5, utf8(inv.Client.Name), "", 1, "L", false, 0, "")
	if inv.Client.Address != "" {
		pdf.MultiCell(0, 5, utf8(inv.Client.Address), "", "L", false)
	}
	if inv.Client.TaxID != "" {
		pdf.CellFormat(0, 5, utf8(inv.Client.TaxID), "", 1, "L", false, 0, "")
	}

	// Items table header
	pdf.Ln(4)
	pdf.SetFont("Helvetica", "B", 10)
	// Columns: Description, Qty, Unit Price, Total
	colW := []float64{95, 20, 35, 25}
	headers := []string{tr("pdf.description"), tr("pdf.qty"), tr("pdf.unitPrice"), tr("pdf.total")}
	for i, h := range headers {
		align := "L"
		if i > 0 {
			align = "R"
		}
		pdf.CellFormat(colW[i], 7, utf8(h), "TB", 0, align, false, 0, "")
	}
	pdf.Ln(-1)

	pdf.SetFont("Helvetica", "", 10)
	for _, it := range inv.Items {
		// Description might be long -> use MultiCell logic
		// We'll print in a simple row assuming short descriptions for now
		pdf.CellFormat(colW[0], 6, utf8(it.Description), "B", 0, "L", false, 0, "")
		pdf.CellFormat(colW[1], 6, utf8(formatFloat(it.Quantity)), "B", 0, "R", false, 0, "")
		pdf.CellFormat(colW[2], 6, utf8(formatAmount(it.UnitPrice)), "B", 0, "R", false, 0, "")
		pdf.CellFormat(colW[3], 6, utf8(formatAmount(it.Total)), "B", 0, "R", false, 0, "")
		pdf.Ln(-1)
	}

	// Totals section
	pdf.Ln(2)
	rightX := 15 + colW[0] + colW[1] + colW[2]
	pdf.SetXY(rightX, pdf.GetY())
	pdf.CellFormat(colW[3], 6, utf8(tr("pdf.subtotal")+": "+formatAmount(inv.Subtotal)), "", 1, "R", false, 0, "")
	pdf.SetXY(rightX, pdf.GetY())
	pdf.CellFormat(colW[3], 6, utf8(tr("pdf.tax")+" ("+formatFloat(inv.TaxRate)+"%): "+formatAmount(inv.TaxAmount)), "", 1, "R", false, 0, "")
	if inv.DiscountAmount > 0 {
		pdf.SetXY(rightX, pdf.GetY())
		pdf.CellFormat(colW[3], 6, utf8(tr("pdf.discount")+": -"+formatAmount(inv.DiscountAmount)), "", 1, "R", false, 0, "")
	}
	pdf.SetFont("Helvetica", "B", 11)
	pdf.SetXY(rightX, pdf.GetY())
	pdf.CellFormat(colW[3], 7, utf8(tr("pdf.grandTotal")+": "+formatMoney(inv.Currency, inv.Total)), "", 1, "R", false, 0, "")
	pdf.SetFont("Helvetica", "", 10)

	// Invoice footer: centered text at the end of the bill (not a page footer)
	if ft := strings.TrimSpace(inv.FooterText); ft != "" {
		pdf.Ln(6)
		pdf.SetFont("Helvetica", "", 10)
		// Center across full width; wrap if necessary
		pdf.MultiCell(0, 5, utf8(ft), "", "C", false)
	}

	// Ensure directory exists
	if err := ensureDir(filepath.Dir(outPath)); err != nil {
		return err
	}

	return pdf.OutputFileAndClose(outPath)
}
