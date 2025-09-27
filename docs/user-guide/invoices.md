# User Guide: Invoices

Invoices record billable transactions between a company and a client.

## Key Concepts

| Concept | Notes |
|---------|------|
| Number | Sequential integer, set by default to the next number |
| Issue Date | Invoice issue date (printed on PDF) |
| Due Date | Optional |
| Fiscal Year | Manually set; used for grouping/reporting |
| Currency | ISO 4217 code (UI limited set) |
| Tax Rate | Percentage applied to subtotal (not per item) |
| Discount | Absolute amount deducted before tax total |
| Status | Draft / Pending / Sent / Paid / Void (manually updated) |
| Footer Text | Printed at bottom of PDF |

## Line Items

| Field | Description |
|-------|-------------|
| Description | What is being billed |
| Quantity | Supports fractional (e.g. hours) |
| Unit Price | Monetary amount (no currency symbol) |
| Total | Auto: Quantity * Unit Price |

## Calculations

Subtotal = Σ(line totals)

TaxAmount = Subtotal * (TaxRate / 100)

Total = Subtotal + TaxAmount - DiscountAmount

## PDF Export

Invoices can be exporter on PDF format thought the export button on the invoice list.
