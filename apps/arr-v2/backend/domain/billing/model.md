# Billing Domain Model

## BillingSchedule
Represents planned or actual billing events associated with a contract line.

Fields:
- id
- contract_line_id
- billing_event_type (planned | actual | milestone | invoice)
- billing_date
- amount
- invoice_number (optional)
- source_system (optional)
- source_import_id (optional)
- status
- created_at

## Notes
- Planned billing from CRM/contracts may later be replaced or reconciled with actual accounting invoices.
- Billing schedule should not be assumed to be monthly or regular.
