# B2B Invoice Extractor

A Python-based invoice extraction system using Google's Gemini API and Pydantic structured outputs.

## Features
- Extracts structured data from PDF invoices.
- Uses Gemini multimodal AI.
- Validates output using Pydantic.
- Supports nested billing addresses and line items.
- Saves extracted data as JSON.
- Evaluates results against ground truth.

## Tech Stack
- Python 3.12
- Google Gemini API
- Google GenAI SDK
- Pydantic
- PyMuPDF
- python-dotenv

## Project Structure
- samples/ - 10 sample invoice PDFs
- outputs/ - Extracted JSON files
- schema.py - Pydantic data schema
- main.py - Invoice extraction
- generate_samples.py - Sample generation
- ground_truth.jsonl - Expected invoice data
- evaluate.py - Accuracy evaluation
- field_accuracy.csv - Field comparison results
- accuracy_summary.md - Evaluation report
- requirements.txt - Dependencies

## Setup

Install dependencies:

    pip install -r extractor/requirements.txt

Configure the root .env file:

    GEMINI_API_KEY=your_gemini_api_key
    GEMINI_MODEL=your_supported_gemini_model

Never upload your API key to GitHub.

## Run Extraction

    python extractor/main.py extractor/samples/invoice_01.pdf

Extracted JSON files are saved in extractor/outputs/.

## Run Evaluation

    python extractor/evaluate.py

## Evaluation Results

- Sample invoices: 10
- Total field comparisons: 120
- Correct comparisons: 120
- Incorrect comparisons: 0
- Overall field accuracy: 100%

This accuracy applies to the 10 sample invoices used for testing. It does not guarantee the same accuracy on unseen invoices.

## Author

Wohlig Bootcamp - Practical Project
