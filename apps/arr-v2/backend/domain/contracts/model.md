# Contracts Domain Model

## Contract
Represents the commercial agreement.

Fields:
- id
- logo_id
- site_id (nullable for enterprise-wide contracts if needed)
- source_contract_id
- contract_name (optional)
- contract_scope (site_specific | multi_site | enterprise_wide)
- effective_date
- signature_date (optional)
- start_date
- end_date
- renewal_date (optional)
- auto_renew
- notice_period_days (optional)
- currency
- status
- early_out_summary (optional)
- source_import_id (optional)
- created_at
- updated_at

## Contract Amendment
Tracks material changes to an existing contract.

Fields:
- id
- contract_id
- amendment_type (expansion | contraction | renewal | termination | repricing | other)
- effective_date
- description
- source_import_id (optional)
- created_at

## Notes
- Enterprise contracts may roll up many sites under one logo.
- Contract scope should be explicit to avoid reporting confusion.
