package i18n

import "strings"

// Dict is a flat map of translation keys to localized strings.
type Dict map[string]string

var locales = map[string]Dict{
	"en": {
		// Company / contact
		"pdf.taxID":   "Tax ID",
		"pdf.email":   "Email",
		"pdf.phone":   "Phone",
		"pdf.website": "Website",

		// Invoice meta
		"pdf.invoice":       "Invoice",
		"pdf.invoiceNumber": "Invoice #",
		"pdf.date":          "Date",
		"pdf.billTo":        "Bill To",

		// Table headers
		"pdf.description": "Description",
		"pdf.qty":         "Qty",
		"pdf.unitPrice":   "Unit Price",
		"pdf.total":       "Total",

		// Totals
		"pdf.subtotal":   "Subtotal",
		"pdf.tax":        "Tax",
		"pdf.discount":   "Discount",
		"pdf.grandTotal": "Total",
	},
	"es": {
		// Company / contact
		"pdf.taxID":   "NIF/CIF",
		"pdf.email":   "Correo",
		"pdf.phone":   "Teléfono",
		"pdf.website": "Sitio web",

		// Invoice meta
		"pdf.invoice":       "Factura",
		"pdf.invoiceNumber": "N. factura",
		"pdf.date":          "Fecha",
		"pdf.billTo":        "Facturar a",

		// Table headers
		"pdf.description": "Descripción",
		"pdf.qty":         "Cant.",
		"pdf.unitPrice":   "Precio unit.",
		"pdf.total":       "Total",

		// Totals
		"pdf.subtotal":   "Subtotal",
		"pdf.tax":        "Impuesto",
		"pdf.discount":   "Descuento",
		"pdf.grandTotal": "Total",
	},
}

// Normalize converts a lang like "es-ES" to a supported base code ("es" or "en").
func Normalize(lang string) string {
	l := strings.ToLower(strings.TrimSpace(lang))
	if strings.HasPrefix(l, "es") {
		return "es"
	}
	return "en"
}

// Tr returns the translated string for key in the given language, falling back to English
// and then to the key itself if not found.
func Tr(lang, key string) string {
	base := Normalize(lang)
	if v, ok := locales[base][key]; ok {
		return v
	}
	if v, ok := locales["en"][key]; ok {
		return v
	}
	return key
}

// T returns a translator function bound to the specified language.
func T(lang string) func(string) string {
	return func(key string) string { return Tr(lang, key) }
}
