# CoT Experiment – Decision Rule

## Experiment details

- Model: gemini-3.5-flash-lite
- Scenarios: 15
- Planned API calls: 105
- Direct temperature: 0
- CoT temperature: 0
- Self-Consistency temperature: 0.7
- Self-Consistency samples per scenario: 5
- Cost: estimated using Standard paid-tier list pricing

## Accuracy and cost comparison

| Method | Correct | Accuracy | Total cost (USD) | Cost per correct answer (USD) |
|---|---:|---:|---:|---:|
| Direct | 15/15 | 100.00% | $0.00133230 | 0.00008882 |
| CoT | 15/15 | 100.00% | $0.00787330 | 0.00052489 |
| Self-Consistency | 15/15 | 100.00% | $0.04410400 | 0.00294027 |

## Decision rule

1. Prefer the method with the highest measured accuracy.
2. If two or more methods have equal accuracy, prefer the one with the lowest cost per correct answer.
3. Use Self-Consistency only when its accuracy improvement justifies its additional API cost.
4. Do not assume CoT or Self-Consistency is better; use the measured results.

**Best method under this rule:** Direct

It achieved 15/15 correct answers (100.00% accuracy).

## Limitations

- Results are based on 15 scenarios only.
- Self-Consistency uses majority voting over five independent responses.
- Costs are estimates using published Standard paid-tier rates; actual billing may differ.
- A larger and more diverse test set is needed before generalizing the result.
