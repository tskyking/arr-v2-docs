# ARR Domain Model

## ARRPolicy
Defines how ARR should be treated for a company or context.

Fields:
- id
- company_context_id (or future tenant/company id)
- name
- description
- is_default
- settings_json
- created_at
- updated_at

## ARRMonthlyOverride
Allows an admin to override ARR for a specific line/period.

Fields:
- id
- contract_line_id
- period_month
- original_arr_amount
- override_arr_amount
- reason
- changed_by
- approved_by (optional)
- created_at

## Notes
- ARR is configurable and not a universal fixed formula.
- Monthly override capability is explicitly required.
