# FOSSInvoice

FOSSInvoice is a free, open sourced, desktop application desgined to be used by any company that want a easy and lightway Invoice system. It's a fully local application, with no need to create accounts, external services or even Internet access. 

## What It Does

Create and manage invoices for multiple business identities ("companies") in one place, generate clean PDF documents with your branding, and keep everything stored in a portable database file you fully own.

## Core Product Principles

| Principle | What it Means |
|-----------|---------------|
| Focused Scope | Invoicing essentials first. Avoid bloat. |
| Local‑First | All data lives on your computer. No forced cloud. |
| Multi‑Company | Manage multiple companies. Switch easily between them. |
| Portable Data | A single database file you can copy, move, version, or back up. |

## Key Features (Early Stage)

- Manage multiple companies (name, tax ID, address, contact details, logo)
- Maintain a list of clients per company
- Draft invoices with line items (quantity, unit price, automatic totals)
- Single tax rate + optional absolute discount per invoice (more flexible tax/discount logic coming)
- Localized PDF export with logo, structured layout, totals
- JSON-based UI translations (multi-language)
- Per‑invoice optional footer text
- Invoice status, switch easily as the process evolves
- Lightweight application, works on (almost) any specs

## What You Can Use It For

| Scenario | How FOSSInvoice Helps |
|----------|-----------------------|
| Freelancer with multiple brands | Keep each brand as a separate company; only one app |
| Privacy‑sensitive work | Avoid uploading client billing data to third parties |
| Offline environments | Generate invoices without an internet connection |
| Portable workflows | Carry DB + binary on encrypted USB / synced folder |
| Simple archiving | Easy backup and restore with only copying a file |

## Portable Database Concept

All operational data sits in one database file:

```
companies, clients, invoices, invoice_items
```

Backups are trivial:

1. Exit the app
2. Copy the DB file to a backup location (cloud drive, git-crypt repo, USB, etc.)
3. Restore by replacing the file

## Data Ownership & Transparency

No hidden sync, telemetry, or remote API calls. Your data never leaves your computer unless you explicitly move or share it.

## Who It’s For

| User Type | Fit |
|-----------|-----|
| Solo freelancer | Strong (multi‑brand + portability) |
| Entrepreneurs | Strong (easy + clean) |
| Boutique agency | Good for lightweight billing |
| Data‑privacy advocate | Ideal – local & inspectable |
| Enterprise accounting | Not a target (no heavy compliance stack) |

## Differentiators vs SaaS Invoicing

| Area | SaaS Tool | FOSSInvoice |
|------|-----------|-------------|
| Data Control | Vendor DB | Your local file |
| Offline Use | Limited | Full |
| Cost | Subscription | Free & Open source |
| Customization | Varies | Source available |
| Export Effort | Often partial | Copy one file |

## Where to Go Next

| Need | Page |
|------|------|
| Install or run | Installation |
| Learn core flows | User Guide |
| Contribute / extend | Developer Guide |
| Common questions | FAQ |
| Release progress | Changelog (WIP) |

---

> Want something specific? Open an issue on [GitHub](https://github.com/FOSSInvoice/fossinvoice/issues).
