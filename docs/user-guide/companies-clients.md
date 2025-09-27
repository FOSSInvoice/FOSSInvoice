# User Guide: Companies & Clients

## Companies

Companies represent your own business entities (you can manage multiple) with their own Name, tax ID, Address and logo.

### Overview

| Field | Description |
|-------|-------------|
| Name | Legal or trade name |
| Address | Postal/billing address (multi-line) |
| Tax ID | VAT / EIN / NIF etc. |
| Contact (embedded) | Email / phone / website |
| Logo | Base64 image stored for PDF header |

### Actions

- Create / Edit / Delete company
- Upload / change logo
- Set default values for invoices

### Logo Recommendations

| Aspect | Recommendation |
|--------|----------------|
| Format | PNG (transparent) or JPEG |
| Size | ~256x256 px (scaled in PDF) |
| File size | Keep small (<200 KB) |

### Data Storage

All company data lives in the local SQLite database.

## Clients

Clients are buyers you issue invoices to.

### Fields

| Field | Description |
|-------|-------------|
| Name | Client or organization name |
| Address | Billing address |
| Tax ID | VAT / EIN etc. |
| Contact (embedded) | Optional email / phone / website |

### Actions

- Create / Edit / Delete client
- View list filtered by current company

## Best Practices

- Keep tax IDs consistent for compliance
- Use full legal address for PDF exports
