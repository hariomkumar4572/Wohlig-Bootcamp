# Prompt Chaining – Learnings

## 1. Experiment Summary

The prompt chaining pipeline was tested with five different product briefs:
1. PocketStudio
2. EcoSip Bottle
3. StudyMate Planner
4. FitTrack Band
5. GlowDesk Lamp

Each brief passed through three sequential stages:
- Step 1: Extract product attributes.
- Step 2: Generate exactly three advertising variants.
- Step 3: Select the strongest brand-compliant variant.

## 2. Execution Results

- Total product briefs: 5
- Successful runs: 5
- Failed runs: 0
- Total pipeline stages executed: 15
- Successful pipeline stages: 15

All five runs completed successfully.

## 3. What I Learned

- Breaking a complex task into smaller prompts makes the workflow easier to manage.
- Structured JSON output helps pass information between stages.
- Step 1 provides the product attributes required by Step 2.
- Step 2 generates three different advertising approaches.
- Step 3 evaluates the variants using brand rules and selects a winner.
- Validation helps prevent incomplete or incorrectly structured outputs.

## 4. How Step 1 Errors Affect Step 2

Step 1 is the foundation of the pipeline.

If product attributes are extracted incorrectly:
- Step 2 may generate inaccurate advertising content.
- Missing product features may result in incomplete advertisements.
- Incorrect target audiences may produce irrelevant messaging.
- Unsupported attributes may lead to misleading product claims.

Therefore, Step 1 output is validated before it is passed to Step 2.

## 5. Error Handling

The pipeline includes the following error-handling measures:

- Checks whether the Gemini API key is available.
- Uses structured response schemas for JSON generation.
- Validates required product attributes.
- Checks that Step 2 generates exactly three variants.
- Checks that variant names are unique.
- Verifies that the selected winner exists in the generated variants.
- Checks the selected advertisement against forbidden superlatives.
- Saves an error message in error.txt if a run fails.
- Continues processing the remaining briefs if one run fails.

## 6. Limitations

- The experiment uses only five product briefs.
- The quality of generated advertisements depends on the accuracy of the input brief.
- Model-generated content still requires human review.
- The current pipeline checks selected advertising copy for specified forbidden terms, but does not guarantee detection of every misleading claim.

## 7. Conclusion

The Prompt Chaining pipeline successfully processed all five product briefs through three sequential stages. It generated structured product attributes, created three advertising variants per product, and selected a winner using the defined brand rules.

All five runs completed without errors, demonstrating that the three-stage workflow works successfully for the tested inputs.
