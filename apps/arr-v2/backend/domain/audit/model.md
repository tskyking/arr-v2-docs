# Audit Domain Model

## AuditEvent
Tracks important system and user changes.

Fields:
- id
- entity_type
- entity_id
- event_type
- old_value_json (optional)
- new_value_json (optional)
- reason (optional)
- actor_user_id (optional)
- source_context (system | import | admin_ui | api)
- created_at

## Notes
- Manual changes to ARR/revenue-related fields should always be auditable.
