# Customers Domain Model

## Entities

### Logo
Represents the parent commercial customer / enterprise relationship.

Fields:
- id
- external_id (optional)
- name
- crm_parent_account_id (optional)
- status
- notes
- created_at
- updated_at

### Site
Represents the local entity, subsidiary, billing entity, or site under a logo.

Fields:
- id
- logo_id
- external_id (optional)
- name
- accounting_customer_id (optional)
- crm_account_id (optional)
- billing_entity_name (optional)
- region (optional)
- status
- created_at
- updated_at

## Notes
- A logo may have many sites.
- Reporting should support both site-level and logo-level rollups.
- Site and logo should remain distinct even when names are similar.
