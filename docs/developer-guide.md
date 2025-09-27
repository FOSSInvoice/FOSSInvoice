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

### Frontend
`frontend/src/i18n/locales/*.ts` define key-value maps. Add new file, register it, extend language switcher.

### Backend (PDF Labels)
`internal/i18n` provides a translator function: `i18n.T(lang)(key)`.

### Adding a New Language
1. Copy `en.ts` -> `<lang>.ts`
2. Translate keys
3. Register in language selector/UI (planned central config)
4. Add backend label map in Go
5. Set `language` in config or choose via UI (planned persistence)

Fallback: English if missing key.

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
