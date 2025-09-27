<div align="center">

# FOSSInvoice

Free & open-source desktop invoicing app built with Go (Wails v3) + React/TypeScript. 100% local, no vendor lock-in, portable database, and PDF export out of the box.

</div>

## ✨ Features (Implemented / Planned)

- Multi-company support (own your data per business entity)
- Clients management (addresses, tax IDs, contact info)
- Invoice drafting with line items, tax %, discounts & automatic totals
- Per-invoice footer + notes
- PDF export (localized & includes company logo)
- Configurable language (i18n: English, Spanish currently)
- Embedded SQLite database (no external services required)
- Cross‑platform builds (Windows / macOS / Linux)
- Planned: whatever is needed

## 🧱 Tech Stack

| Area | Tech |
|------|------|
| Platform | Wails v3 (Go + WebView) |
| Backend | Go 1.22+, GORM (SQLite) |
| Frontend | React + TypeScript + Vite |
| PDF | go-pdf/fpdf | 
| i18n | Simple key-based translator (internal) |

## 🚀 Quick Start (Development)

Prereqs: Go 1.22+, Node 18+, Wails v3 CLI installed.

```
go install github.com/wailsapp/wails/v3/cmd/wails3@latest
```

Run the app with live reload:

```
wails3 dev
```

## 📂 Repository Structure (High-Level)

```
internal/        # Go domain models, services (db, pdf, config, i18n)
frontend/        # React/Vite application
build/           # Platform packaging assets (icons, manifests, scripts)
bin/             # Build outputs / installers
main.go          # Wails entrypoint
```

## 🧾 Data Model Snapshot

Entities: Company → Clients → Invoices → InvoiceItems. 

## 🌐 Internationalization

Basic translator abstraction with English + Spanish bundles. New languages can be added (see Developer Guide in `docs/`).

## 📄 PDF Generation

Invoices are rendered with `fpdf` including:
- Company logo (base64) & contact info
- Client block
- Line items table (qty, unit price, totals)
- Subtotal / tax / discount / grand total
- Localized labels & currency formatting (basic)

## 🛠 Configuration

Configuration is read from a local config file stored in the user home path. Defaults to English if language not set.

## 📚 Documentation

Minimal docs live in `docs/`.

Preview locally (after installing MkDocs Material):

```
pip install mkdocs mkdocs-material
mkdocs serve
```

## 🤝 Contributing

Open issues & PRs welcome (no formal guide yet). Keep changes small & focused; include screenshots for UI tweaks.

## 🙏 Acknowledgements

- Wails project & community
- go-pdf/fpdf
- Open-source ecosystem
