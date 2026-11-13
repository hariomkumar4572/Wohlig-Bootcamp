import argparse
import os
import re
from pathlib import Path

from dotenv import load_dotenv
from google import genai

ROOT_DIR = Path(__file__).resolve().parent.parent
META_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = META_DIR / "generated_prompts"

MODEL = "gemini-3.5-flash-lite"

load_dotenv(ROOT_DIR / ".env")


def create_client():
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY missing. Check the root .env file."
        )

    return genai.Client(api_key=api_key)


def load_meta_prompt():
    path = META_DIR / "meta_prompt.txt"
    return path.read_text(encoding="utf-8")


def generate_prompt(client, meta_prompt, brief):
    full_prompt = (
        meta_prompt
        .replace("[INSERT THE VAGUE USER BRIEF HERE]", brief)
    )

    response = client.models.generate_content(
        model=MODEL,
        contents=full_prompt
    )

    if not response.text:
        raise RuntimeError("Gemini returned an empty response.")

    return response.text.strip()


def load_test_briefs():
    content = (META_DIR / "test_briefs.md").read_text(
        encoding="utf-8"
    )

    pattern = (
        r"## Brief (\d+) – (.+?)\n"
        r"(.*?)(?=\n## Brief |\Z)"
    )

    matches = re.findall(pattern, content, re.DOTALL)
    briefs = []

    for brief_id, title, description in matches:
        briefs.append({
            "id": brief_id,
            "title": title.strip(),
            "brief": description.strip()
        })

    if not briefs:
        raise RuntimeError("No briefs found in test_briefs.md")

    return briefs


def save_prompt(filename, generated_prompt):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / filename

    output_path.write_text(
        generated_prompt + "\n",
        encoding="utf-8"
    )

    print(f"Saved: {output_path}")


def main():
    parser = argparse.ArgumentParser(
        description="Generate structured prompts from vague briefs."
    )

    parser.add_argument(
        "brief",
        nargs="?",
        help="A vague brief to convert into a structured prompt."
    )

    parser.add_argument(
        "--all",
        action="store_true",
        help="Generate prompts for all five test briefs."
    )

    args = parser.parse_args()

    if not args.all and not args.brief:
        parser.error("Provide a brief or use --all.")

    client = create_client()
    meta_prompt = load_meta_prompt()

    if args.all:
        briefs = load_test_briefs()

        for item in briefs:
            print(f"\nProcessing Brief {item['id']}: {item['title']}")

            generated = generate_prompt(
                client,
                meta_prompt,
                item["brief"]
            )

            filename = f"brief_{item['id']}_prompt.txt"
            save_prompt(filename, generated)

        print("\nAll test briefs processed successfully.")

    else:
        generated = generate_prompt(
            client,
            meta_prompt,
            args.brief
        )

        print("\n" + generated)

        save_prompt("custom_prompt.txt", generated)


if __name__ == "__main__":
    main()
