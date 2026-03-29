# Import Pipeline Outline

## Stage 1 — Read workbook/CSV package
- load transaction detail rows
- load product/service mappings
- load recognition assumptions
- optionally load alias rows

## Stage 2 — Validate structure
- required sheets/files present
- required columns present
- parseable data types

## Stage 3 — Normalize source values
- standardize field names
- parse dates
- parse numeric values
- normalize blanks/zeros for subscription dates

## Stage 4 — Resolve classifications
- map product/service to primary category
- map category to rule type
- flag unresolved/ambiguous mappings

## Stage 5 — Produce normalized import rows
- generate canonical intermediate objects
- attach review flags where needed
- preserve source row number and lineage

## Stage 6 — Hand off to downstream contract/ARR processing
- review queue
- schedule generation
- later contract/ARR logic
