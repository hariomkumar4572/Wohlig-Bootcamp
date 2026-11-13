import json
import os
import re
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types


# Project paths
BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent

PROMPTS_DIR = BASE_DIR / "prompts"
BRIEFS_DIR = BASE_DIR / "briefs"
RUNS_DIR = BASE_DIR / "runs"

MODEL = "gemini-3.5-flash-lite"

load_dotenv(ROOT_DIR / ".env")

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise RuntimeError("GEMINI_API_KEY not found in root .env file.")

client = genai.Client(api_key=api_key)


# Structured response schemas
ATTRIBUTES_SCHEMA = types.Schema(
    type=types.Type.OBJECT,
    properties={
        "product_name": types.Schema(type=types.Type.STRING),
        "category": types.Schema(type=types.Type.STRING),
        "key_features": types.Schema(
            type=types.Type.ARRAY,
            items=types.Schema(type=types.Type.STRING)
        ),
        "target_audience": types.Schema(type=types.Type.STRING),
    },
    required=[
        "product_name",
        "category",
        "key_features",
        "target_audience"
    ]
)

VARIANTS_SCHEMA = types.Schema(
    type=types.Type.OBJECT,
    properties={
        "variants": types.Schema(
            type=types.Type.ARRAY,
            items=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "variant_name": types.Schema(type=types.Type.STRING),
                    "headline": types.Schema(type=types.Type.STRING),
                    "body": types.Schema(type=types.Type.STRING),
                    "call_to_action": types.Schema(type=types.Type.STRING),
                },
                required=[
                    "variant_name",
                    "headline",
                    "body",
                    "call_to_action"
                ]
            )
        )
    },
    required=["variants"]
)

WINNER_SCHEMA = types.Schema(
    type=types.Type.OBJECT,
    properties={
        "winner_variant_name": types.Schema(type=types.Type.STRING),
        "headline": types.Schema(type=types.Type.STRING),
        "body": types.Schema(type=types.Type.STRING),
        "call_to_action": types.Schema(type=types.Type.STRING),
        "explanation": types.Schema(type=types.Type.STRING),
        "compliance_checks": types.Schema(
            type=types.Type.ARRAY,
            items=types.Schema(type=types.Type.STRING)
        ),
    },
    required=[
        "winner_variant_name",
        "headline",
        "body",
        "call_to_action",
        "explanation",
        "compliance_checks"
    ]
)


def read_prompt(filename):
    return (PROMPTS_DIR / filename).read_text(encoding="utf-8")


def generate_json(prompt, data, schema):
    response = client.models.generate_content(
        model=MODEL,
        contents=f"{prompt}\n\nINPUT:\n{data}",
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=schema,
            temperature=0.3
        )
    )

    if not response.text:
        raise ValueError("Gemini returned an empty response.")

    return json.loads(response.text)


def save_json(path, data):
    path.write_text(
        json.dumps(data, indent=4, ensure_ascii=False),
        encoding="utf-8"
    )


def validate_attributes(attributes):
    required = [
        "product_name",
        "category",
        "key_features",
        "target_audience"
    ]

    for field in required:
        if not attributes.get(field):
            raise ValueError(f"Step 1 validation failed: {field} is empty.")

    if not isinstance(attributes["key_features"], list):
        raise ValueError("key_features must be a list.")

    if not all(
        isinstance(feature, str) and feature.strip()
        for feature in attributes["key_features"]
    ):
        raise ValueError("key_features contains invalid values.")


def validate_variants(data):
    variants = data.get("variants")

    if not isinstance(variants, list) or len(variants) != 3:
        raise ValueError("Step 2 must generate exactly 3 variants.")

    names = [v["variant_name"] for v in variants]

    if len(set(names)) != 3:
        raise ValueError("Variant names must be unique.")


def validate_winner(winner, variants):
    name = winner.get("winner_variant_name")

    selected = next(
        (v for v in variants if v["variant_name"] == name),
        None
    )

    if selected is None:
        raise ValueError("Selected winner does not match any variant.")

    # Preserve the original selected copy without rewriting it.
    for field in ["headline", "body", "call_to_action"]:
        winner[field] = selected[field]

    forbidden = [
        r"\bbest\b",
        r"\bcheapest\b",
        r"\bnumber one\b",
        r"\bguaranteed\b"
    ]

    copy_text = " ".join([
        winner["headline"],
        winner["body"],
        winner["call_to_action"]
    ])

    for pattern in forbidden:
        if re.search(pattern, copy_text, re.IGNORECASE):
            raise ValueError(
                f"Brand compliance failed: forbidden claim {pattern}"
            )


def run_pipeline():
    RUNS_DIR.mkdir(parents=True, exist_ok=True)

    extract_prompt = read_prompt("extract.txt")
    generate_prompt = read_prompt("generate.txt")
    select_prompt = read_prompt("select.txt")

    brand_rules = (
        BASE_DIR / "brand_rules.md"
    ).read_text(encoding="utf-8")

    briefs = sorted(BRIEFS_DIR.glob("brief_*.txt"))

    if len(briefs) != 5:
        raise RuntimeError(
            f"Expected 5 product briefs, found {len(briefs)}."
        )

    successful = 0
    failed = 0

    for index, brief_path in enumerate(briefs, start=1):
        run_dir = RUNS_DIR / f"run_{index:02d}"
        run_dir.mkdir(parents=True, exist_ok=True)

        brief = brief_path.read_text(encoding="utf-8")

        (run_dir / "input_brief.txt").write_text(
            brief, encoding="utf-8"
        )

        print(f"\nProcessing {brief_path.name}")

        try:
            # STEP 1: EXTRACT
            print("STEP 1: Extracting attributes...")

            attributes = generate_json(
                extract_prompt,
                brief,
                ATTRIBUTES_SCHEMA
            )

            validate_attributes(attributes)

            save_json(
                run_dir / "step1_attributes.json",
                attributes
            )

            print("STEP 1: SUCCESS")

            # STEP 2: GENERATE
            print("STEP 2: Generating 3 variants...")

            variants_data = generate_json(
                generate_prompt,
                json.dumps(attributes, ensure_ascii=False),
                VARIANTS_SCHEMA
            )

            validate_variants(variants_data)

            save_json(
                run_dir / "step2_variants.json",
                variants_data
            )

            print("STEP 2: SUCCESS")

            # STEP 3: SELECT
            print("STEP 3: Selecting winner...")

            selection_input = (
                "BRAND RULES:\n"
                + brand_rules
                + "\n\nPRODUCT ATTRIBUTES:\n"
                + json.dumps(attributes, ensure_ascii=False)
                + "\n\nAD VARIANTS:\n"
                + json.dumps(variants_data, ensure_ascii=False)
            )

            winner = generate_json(
                select_prompt,
                selection_input,
                WINNER_SCHEMA
            )

            validate_winner(
                winner,
                variants_data["variants"]
            )

            save_json(
                run_dir / "step3_winner.json",
                winner
            )

            successful += 1
            print(f"RUN {index}: SUCCESS")

        except Exception as error:
            failed += 1

            (run_dir / "error.txt").write_text(
                f"{type(error).__name__}: {error}",
                encoding="utf-8"
            )

            print(f"RUN {index}: FAILED - {error}")

    print("\n========== PIPELINE SUMMARY ==========")
    print(f"Total runs: {len(briefs)}")
    print(f"Successful: {successful}")
    print(f"Failed: {failed}")
    print("======================================")


if __name__ == "__main__":
    run_pipeline()