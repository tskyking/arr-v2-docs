# Imports Domain Model

## SourceImport
Tracks uploaded/exported source material and processing lineage.

Fields:
- id
- source_system
- source_type
- filename
- uploaded_by
- mapping_template_id (optional)
- processing_status
- warning_count
- error_count
- created_at

## MappingDecision
Tracks how source fields or values were interpreted.

Fields:
- id
- source_import_id
- source_field
- mapped_field
- transformation_rule (optional)
- confidence_score (optional)
- requires_review
- created_at

## Notes
- This is where later AI-assisted mapping can coexist with deterministic validation.
