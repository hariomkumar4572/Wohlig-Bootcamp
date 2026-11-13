# Meta-Prompting Experiment – Findings

## Objective
The objective was to convert vague user briefs into structured, reusable prompts using a single meta-prompt and the Gemini API.

## Implementation
- Created a reusable meta-prompt with six required sections: ROLE, CONTEXT, TASK, CONSTRAINTS, FORMAT, and EXAMPLES.
- Built a Python CLI using the Gemini API and the `google-genai` SDK.
- Used the model `gemini-3.5-flash-lite`.
- Generated prompts for five different business tasks.

## Test Results

| Brief | Quality Score |
|---|---:|
| PDF Data Extraction | 3/5 |
| Support Email Classification | 4/5 |
| Product Description | 3/5 |
| Legal Document Summary | 4/5 |
| Marketing Translation | 4/5 |

**Average quality score: 3.6/5**

- Prompts generated successfully: 5/5
- Prompts containing all six required sections: 5/5
- Generation failures: 0

## Key Observations

1. The meta-prompt consistently generated all six required sections.
2. Some generated examples contained invalid JSON or unsupported claims.
3. Generic placeholders sometimes required more specific input details.
4. Domain-specific requirements, such as OCR handling, legal jurisdiction, and translation variants, needed improvement.
5. Text encoding and formatting issues appeared in some generated prompts.

## When Meta-Prompting Is Useful

- Complex tasks with multiple requirements.
- Repeated client projects requiring consistent prompt structure.
- Creating reusable prompts for different business workflows.
- Converting unclear requirements into actionable instructions.

## When Manual Prompting Is Faster

- Simple, one-time tasks.
- Familiar tasks with clearly defined requirements.
- Situations where creating a separate meta-prompt adds unnecessary overhead.

## Conclusion

The experiment successfully generated five structured prompts, and all five contained the six required sections. The average quality score was 3.6/5.

Meta-prompting provides a useful starting point for prompt creation and improves structural consistency. However, human review is still necessary to identify unsupported assumptions, improve examples, clarify missing requirements, and ensure accuracy.
