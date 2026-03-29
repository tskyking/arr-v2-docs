# Normalized Import Types

## NormalizedImportBundle
- source_import
- normalized_rows
- warnings
- review_items

## NormalizedImportRow
Fields:
- source_row_number
- site_name
- source_invoice_number
- invoice_date
- product_service
- quantity
- amount
- recognized_category
- recognized_rule_type
- subscription_start_date
- subscription_end_date
- requires_review
- review_reasons[]

## ReviewItem
Fields:
- source_row_number
- severity
- reason_code
- message
- related_field_names[]
