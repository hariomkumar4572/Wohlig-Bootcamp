import argparse
import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types

from schema import Invoice


PROJECT_ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = PROJECT_ROOT / ".env"
OUTPUT_DIR = PROJECT_ROOT / "extractor" / "outputs"

load_dotenv(ENV_FILE)

MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


def extract_invoice(pdf_path: Path) -> Invoice:
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY missing. Check the root .env file."
        )

    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    if pdf_path.suffix.lower() != ".pdf":
        raise ValueError("Please provide a PDF file.")

    client = genai.Client(api_key=api_key)

    print(f"Uploading: {pdf_path.name}")

    uploaded_file = client.files.upload(file=str(pdf_path))

    prompt = """
    Extract all invoice information from the supplied PDF.

    Rules:
    - Extract only information explicitly present in the invoice.
    - Do not guess or invent missing values.
    - Use null for missing optional values.
    - Preserve invoice numbers, names, dates and amounts accurately.
    - Extract every line item in the original order.
    - Use the payment status explicitly written in the invoice.
    - If payment status is not clear, use UNKNOWN.
    - Return data according to the supplied response schema.
    """

    print("Sending PDF to Gemini for extraction...")

    response = client.models.generate_content(
        model=MODEL,
        contents=[prompt, uploaded_file],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=Invoice,
            temperature=0,
        ),
    )

    if not response.text:
        raise RuntimeError("Gemini returned an empty response.")

    invoice = Invoice.model_validate_json(response.text)

    return invoice


def main():
    parser = argparse.ArgumentParser(
        description="Extract structured invoice data from a PDF using Gemini."
    )
    parser.add_argument(
        "pdf_path",
        help="Path to the invoice PDF file."
    )
    args = parser.parse_args()

    pdf_path = Path(args.pdf_path).resolve()

    try:
        invoice = extract_invoice(pdf_path)

        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

        output_path = OUTPUT_DIR / f"{pdf_path.stem}.json"

        invoice_json = invoice.model_dump_json(
            indent=2,
            exclude_none=False
        )

        output_path.write_text(
            invoice_json,
            encoding="utf-8"
        )

        print("\nExtraction successful!")
        print(f"Model: {MODEL}")
        print(f"Saved output: {output_path}")
        print("\nExtracted invoice data:\n")
        print(invoice_json)

    except Exception as error:
        print(f"\nExtraction failed: {error}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
