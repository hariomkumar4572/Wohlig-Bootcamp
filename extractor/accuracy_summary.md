# Invoice Extraction Accuracy Report

- Total invoices in ground truth: 10
- Evaluated field comparisons: 120
- Correct field comparisons: 120
- Incorrect field comparisons: 0
- Overall field accuracy: 100.00%

## Field-wise Accuracy

| Field | Correct | Total | Accuracy |
|---|---:|---:|---:|
| invoice_number | 10 | 10 | 100.00% |
| invoice_date | 10 | 10 | 100.00% |
| due_date | 10 | 10 | 100.00% |
| seller_name | 10 | 10 | 100.00% |
| buyer_name | 10 | 10 | 100.00% |
| billing_address | 10 | 10 | 100.00% |
| line_items | 10 | 10 | 100.00% |
| payment_status | 10 | 10 | 100.00% |
| currency | 10 | 10 | 100.00% |
| subtotal | 10 | 10 | 100.00% |
| tax_amount | 10 | 10 | 100.00% |
| total_amount | 10 | 10 | 100.00% |

## Evaluation Method

Each extracted top-level field was compared with its corresponding ground-truth value using exact equality.
Nested addresses and line-item lists were compared as complete structures. Numeric values were compared using Python numeric equality.
