# Classification Adjustment Model

## ClassificationAdjustment
Represents a reclassification event such as moving an account/line/customer relationship between Enterprise and Self-Serve categories.

Fields:
- id
- related_entity_type
- related_entity_id
- previous_classification
- new_classification
- reason
- created_by
- approved_by (optional)
- created_at

## Notes
- This is useful where reporting categories materially affect ARR/retention interpretation.
- Should be auditable and approval-aware when sensitive.
