# Contract Lines / SKU Model

## ContractLine
Represents a product/service line or SKU within a contract.

Fields:
- id
- contract_id
- source_line_id (optional)
- sku
- product_name
- product_family (optional)
- quantity
- unit_price
- total_amount
- recurrence_type (recurring | non_recurring | hybrid)
- arr_treatment_method
- revenue_recognition_method
- start_date
- end_date
- cancellation_date (optional)
- status
- renewal_arr_delta (optional)
- notes (optional)
- created_at
- updated_at

## Notes
- ARR treatment method and revenue recognition method should be separate.
- A recurring training or consulting line may still need special policy treatment.
