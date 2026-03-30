# Import Service Skeleton

This is the first code skeleton for ARR V2 import handling.

Current scope:
- import types
- basic header validation
- basic normalization pipeline
- initial review-flag generation

Not implemented yet:
- actual workbook/xlsx reader (boundary added; parser not implemented yet)
- sheet detection (initial heuristic layer added)
- category/rule resolution from raw worksheets
- persistence layer
- tests
