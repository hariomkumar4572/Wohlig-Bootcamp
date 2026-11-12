# Prompting Styles Evaluation Report

## 1. Objective

The objective of this experiment is to compare three prompting techniques — Zero-Shot, Few-Shot, and Role-Based prompting — for classifying customer support tickets into predefined categories using Gemini Flash.

## 2. Dataset and Methodology

- Total tickets: 30
- Categories: Refund, Shipping, Login, Payment, Account, Product Quality, Order Change, Other
- Ground-truth labels: Manually assigned
- AI model: Gemini Flash
- Prompting techniques tested: Zero-Shot, Few-Shot, Role-Based
- Total predictions: 90 (30 per prompting technique)

Each prompt was used to classify all 30 tickets. The predictions were compared with manually assigned ground-truth labels.

Accuracy formula:

Accuracy = (Number of Correct Predictions / Total Predictions) * 100

## 3. Accuracy Results

| Prompting Style | Correct Predictions | Total | Accuracy |
|---|---:|---:|---:|
| Zero-Shot | 29 | 30 | 96.67% |
| Few-Shot | 30 | 30 | 100.00% |
| Role-Based | 30 | 30 | 100.00% |

## 4. Example Analysis

### Examples correctly classified by all three styles

**T001 – Refund**
- Ground Truth: Refund
- Zero-Shot: Refund
- Few-Shot: Refund
- Role-Based: Refund
- Result: All three styles correct.

**T005 – Shipping**
- Ground Truth: Shipping
- Zero-Shot: Shipping
- Few-Shot: Shipping
- Role-Based: Shipping
- Result: All three styles correct.

**T009 – Login**
- Ground Truth: Login
- Zero-Shot: Login
- Few-Shot: Login
- Role-Based: Login
- Result: All three styles correct.

### Incorrect prediction analysis

**T018 – Account**

Ticket: "My account has been temporarily blocked. Please help me restore access."

- Ground Truth: Account
- Zero-Shot Prediction: Login (Incorrect)
- Few-Shot Prediction: Account (Correct)
- Role-Based Prediction: Account (Correct)

Zero-Shot confused an account restriction with a login problem. Few-Shot and Role-Based correctly identified the issue as Account.

Few-Shot and Role-Based had no incorrect predictions in this evaluation. Therefore, no failure examples exist for these two styles in this dataset.

## 5. Comparison and Findings

**Zero-Shot Prompting**
- Requires no examples in the prompt.
- Achieved 96.67% accuracy.
- Made one classification error on ticket T018.

**Few-Shot Prompting**
- Uses examples to demonstrate the expected classification.
- Achieved 100% accuracy.
- Correctly classified all 30 tickets.

**Role-Based Prompting**
- Assigns the model a specific role and provides task-oriented instructions.
- Achieved 100% accuracy.
- Correctly classified all 30 tickets.

Few-Shot and Role-Based tied for the highest accuracy in this experiment. Neither outperformed the other on the tested dataset.

## 6. Conclusion

In this experiment, Few-Shot and Role-Based prompting achieved the highest accuracy of 100%, while Zero-Shot achieved 96.67%.

The T018 example shows how examples and role-specific instructions can help distinguish between related categories such as Account and Login.

Based on this 30-ticket dataset, Few-Shot and Role-Based prompting performed better than Zero-Shot. However, a larger and more diverse dataset would be needed to determine whether this performance difference generalizes to real-world customer support tickets.

## 7. Output Files

- tickets.json – 30 customer support tickets with ground-truth labels.
- prompts/zero_shot.txt – Zero-Shot prompt.
- prompts/few_shot.txt – Few-Shot prompt.
- prompts/role_based.txt – Role-Based prompt.
- run-evaluation.mjs – Gemini evaluation script.
- styles_eval.csv – Predictions and correctness results for all 90 classifications.
- styles_finding.md – This evaluation report.
