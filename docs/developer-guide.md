# Developer Guide

Technical reference for contributors and advanced users.

## 1. Stack Overview

| Area | Tech |
|------|------|
| Platform | Wails v3 (Go + WebView) |
| Backend | Go 1.22+, GORM (SQLite) |
| Frontend | React + TypeScript + Vite |
| PDF | go-pdf/fpdf | 

## 2. Repository Layout

```
internal/        Go models & services
frontend/        React app (Vite)
build/           Packaging assets & config
bin/             Output binaries/installers
docs/            Documentation site (MkDocs)
```

## 3. Models (GORM)

Relationships:
```
Company 1---* Client 1---* Invoice 1---* InvoiceItem
```
Simplified embedded contact info in company & client.

## 4. Services

| File | Responsibility |
|------|----------------|
| `services/database.go` | DB open/migrate (check actual implementation) |
| `services/pdf.go` | Invoice -> PDF rendering |
| `services/config.go` | Load configuration (language etc.) |

## 5. PDF Generation Flow

```
ExportInvoicePDF(dbPath, invoiceID, outPath, lang)
  -> Open DB
  -> Query invoice + relations
  -> Render header/company/client
  -> Render items & totals
  -> Localized labels via i18n
```

## 6. Internationalization

The app uses simple key-based JSON locale bundles for both the UI and PDF generation.

### Frontend (UI Strings)
Loaded at runtime from `frontend/public/locales/<code>.json` via dynamic `fetch` in `frontend/src/i18n/index.tsx`.

Key lookup uses dot notation (e.g. `common.save`, `messages.noClientsYet`). Missing keys fall back to the path string itself so you can easily spot gaps.

Supported locale codes are declared in `SUPPORTED_LOCALES` inside the i18n provider. The selected code (2‑letters) is persisted through the backend `ConfigService` so that PDFs can reuse the same language.

### Backend (PDF Labels)
PDF label translations live in embedded JSON under `internal/i18n/locales/<code>.json` and are loaded at compile time using `go:embed`. They currently only need the `pdf` section (subset of labels used in the PDF layout).

Translator usage:
```go
tr := i18n.T(lang)
tr("pdf.invoice") // -> localized string or key fallback
```

### Adding a New Language
UI + PDF need coordinated additions.

1. Frontend: copy `frontend/public/locales/en.json` → `<code>.json` and translate values.
2. Backend: copy `internal/i18n/locales/en.json` → `<code>.json` and translate values.
3. Update `SUPPORTED_LOCALES` and `LOCALE_LABELS` in `frontend/src/i18n/index.tsx`.
4. Rebuild (`wails3 dev` or build tasks). The UI will fetch the new JSON; backend will have the embedded file.
5. Switch language in the UI (persists to config) and generate a PDF to verify.

### Keeping Frontend & Backend Locales in Sync
Because we embed backend JSON at compile time and serve frontend JSON at runtime, duplication exists.

### Fallback Strategy
1. Frontend: missing key → key path text.
2. Backend: missing in chosen lang → English → key.

Keep keys stable; renames should update both JSON sets. Avoid embedding variable data inside values—string interpolation is not yet implemented.

## 7. Database

- SQLite single file
- Automatic schema creation via GORM `AutoMigrate` (assumed confirm in code)
- Migration versioning not yet implemented

## 8. Frontend Architecture

- React functional components
- Context providers for selected company, database path, toasts
- Minimal styling

## 9. Dev Workflow

Install wails3 cli:

```
go install github.com/wailsapp/wails/v3/cmd/wails3@latest
```

Dev run with hot realoads:

```
wails3 dev
```

Build debug binary:
```
wails3 task build
```

Build production binary:
```
wails3 task build PRODUCTION=true 
```

Create installed and packaged versions:
```
wails3 task package
```

## 10. Contributing

There's not official docs for this. Contributions are very welcomed and really appreaciated. Just open an Issue or directly a PR for small changes.
