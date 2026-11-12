# Goal 3 – Structured Output Self-Repair

## Objective
Build a reliable structured-output pipeline using Gemini API and JavaScript with Zod validation.

## Implementation
- Gemini generates structured JSON using responseSchema.
- Zod validates name, email, phone, city and pincode.
- Invalid outputs are sent back to Gemini with validation errors.
- Maximum 3 validation retries are supported.
- Temporary Gemini 429 and 503 errors have separate retry handling.
- Missing source pincode is rejected instead of being invented.

## Dataset
20 messy contact-card inputs covering OCR text, typos, mixed formats and incomplete information.

## Results

| Metric | Result |
|---|---:|
| Total inputs | 20 |
| First-attempt valid | 19 |
| Repaired after retry | 1 |
| Final valid | 19 |
| Expected rejection | 1 |
| API errors | 0 |
| Validation retries | 1 |

## Success Rate
- First-attempt acceptance: 19/20 = 95%
- Final acceptance: 19/20 = 95%
- Eligible inputs: 19/19 = 100%

## Example of Self-Repair
Input 03 initially failed email and phone validation. Gemini received the validation feedback and generated a corrected output on the next attempt.

## Expected Rejection
Input 08 does not contain a pincode. The system rejects it rather than inventing missing information.

## Conclusion
The self-repair pipeline successfully processed all 20 test inputs. It repaired one invalid model response, rejected one incomplete input safely, and completed the batch without API errors.

## Technology Stack
JavaScript, Node.js, Gemini API, Zod, dotenv.
