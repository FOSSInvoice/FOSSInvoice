package services

import (
	"os"
	"strconv"
	"strings"
)

func itoa(n int) string { return strconv.Itoa(n) }

func formatFloat(v float64) string {
	return strconv.FormatFloat(v, 'f', -1, 64)
}

func formatMoney(currency string, v float64) string {
	s := strconv.FormatFloat(v, 'f', 2, 64)
	if strings.TrimSpace(currency) == "" {
		return s
	}
	return currency + " " + s
}

// formatAmount returns a numeric amount with 2 decimal places and no currency symbol.
func formatAmount(v float64) string {
	return strconv.FormatFloat(v, 'f', 2, 64)
}

func ensureDir(dir string) error {
	if strings.TrimSpace(dir) == "" {
		return nil
	}
	return os.MkdirAll(dir, 0o755)
}
