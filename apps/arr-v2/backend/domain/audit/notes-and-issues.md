# Notes and Issues Model

## BusinessNote
Represents business/operational commentary tied to a customer, contract, line, or review item.

Fields:
- id
- related_entity_type
- related_entity_id
- note_type (comment | pending_renewal | issue | reminder | other)
- status (open | resolved | informational)
- owner_user_id (optional)
- text
- created_by
- created_at

## Notes
- This is distinct from immutable audit history.
- Intended for operational comments like pending renewals, issue resolution notes, and context that should remain visible in workflow.
