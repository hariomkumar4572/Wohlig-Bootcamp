import csv
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "outputs"
GROUND_TRUTH_FILE = BASE_DIR / "ground_truth.jsonl"
CSV_FILE = BASE_DIR / "field_accuracy.csv"
SUMMARY_FILE = BASE_DIR / "accuracy_summary.md"


def main():
    records = [
        json.loads(line)
        for line in GROUND_TRUTH_FILE.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]

    results = []
    field_stats = {}

    for record in records:
        sample_id = record["sample_id"]
        expected_data = record["ground_truth"]
        output_file = OUTPUT_DIR / f"{sample_id}.json"

        if not output_file.exists():
            print(f"Missing output: {output_file.name}")
            continue

        actual_data = json.loads(output_file.read_text(encoding="utf-8"))

        for field, expected in expected_data.items():
            actual = actual_data.get(field)

            exact_match = (
                field in actual_data and actual == expected
            )

            results.append({
                "sample_id": sample_id,
                "field_name": field,
                "extracted_value": json.dumps(actual, ensure_ascii=False),
                "ground_truth_value": json.dumps(expected, ensure_ascii=False),
                "exact_match": exact_match,
            })

            if field not in field_stats:
                field_stats[field] = {"correct": 0, "total": 0}

            field_stats[field]["total"] += 1

            if exact_match:
                field_stats[field]["correct"] += 1

    if not results:
        print("No evaluation results generated.")
        return

    with CSV_FILE.open("w", newline="", encoding="utf-8-sig") as file:
        writer = csv.DictWriter(
            file,
            fieldnames=[
                "sample_id",
                "field_name",
                "extracted_value",
                "ground_truth_value",
                "exact_match",
            ],
        )
        writer.writeheader()
        writer.writerows(results)

    total_correct = sum(s["correct"] for s in field_stats.values())
    total_fields = sum(s["total"] for s in field_stats.values())
    overall_accuracy = total_correct / total_fields * 100

    lines = [
        "# Invoice Extraction Accuracy Report",
        "",
        f"- Total invoices in ground truth: {len(records)}",
        f"- Evaluated field comparisons: {total_fields}",
        f"- Correct field comparisons: {total_correct}",
        f"- Incorrect field comparisons: {total_fields - total_correct}",
        f"- Overall field accuracy: {overall_accuracy:.2f}%",
        "",
        "## Field-wise Accuracy",
        "",
        "| Field | Correct | Total | Accuracy |",
        "|---|---:|---:|---:|",
    ]

    for field, stats in field_stats.items():
        accuracy = stats["correct"] / stats["total"] * 100
        lines.append(
            f"| {field} | {stats['correct']} | "
            f"{stats['total']} | {accuracy:.2f}% |"
        )

    lines.extend([
        "",
        "## Evaluation Method",
        "",
        "Each extracted top-level field was compared with its "
        "corresponding ground-truth value using exact equality.",
        "Nested addresses and line-item lists were compared as "
        "complete structures. Numeric values were compared using "
        "Python numeric equality.",
        "",
    ])

    SUMMARY_FILE.write_text("\n".join(lines), encoding="utf-8")

    print("\nEvaluation completed!")
    print(f"CSV saved: {CSV_FILE}")
    print(f"Summary saved: {SUMMARY_FILE}")
    print(f"Overall accuracy: {overall_accuracy:.2f}%")
    print(f"Correct comparisons: {total_correct}/{total_fields}")


if __name__ == "__main__":
    main()
