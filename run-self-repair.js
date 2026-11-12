const fs = require("fs");
const path = require("path");
const { repairLoop } = require("./self_repair/repair_loop.js");

// Gemini 3.5 Flash-Lite Standard paid-tier rates (USD per 1M tokens)
const INPUT_RATE = 0.30;
const OUTPUT_RATE = 2.50;

async function main() {
  const inputDir = path.join(__dirname, "self_repair", "inputs");

  const files = fs.readdirSync(inputDir)
    .filter(file => file.endsWith(".txt"))
    .sort();

  const rows = [];

  for (const file of files) {
    console.log(`\nProcessing ${file}...`);

    const input = fs.readFileSync(
      path.join(inputDir, file),
      "utf8"
    );

    try {
      const result = await repairLoop(input);

      const totalCost = (
        (result.input_tokens * INPUT_RATE) +
        (result.output_tokens * OUTPUT_RATE)
      ) / 1000000;

      rows.push({
        input_id: file.replace(".txt", ""),
        first_try_valid: result.first_try_valid,
        final_valid: result.final_valid,
        num_retries: result.num_retries,
        errors_seen: result.errors_seen.join(" | "),
        total_cost: totalCost.toFixed(8)
      });

      console.log(`Final valid: ${result.final_valid}`);
      console.log(`Retries: ${result.num_retries}`);
      console.log(`Estimated cost: $${totalCost.toFixed(8)}`);

    } catch (error) {
      console.error(`Failed ${file}: ${error.message}`);

      rows.push({
        input_id: file.replace(".txt", ""),
        first_try_valid: "",
        final_valid: "",
        num_retries: "",
        errors_seen: `API_ERROR: ${error.message}`,
        total_cost: ""
      });
    }
  }

  const columns = [
    "input_id",
    "first_try_valid",
    "final_valid",
    "num_retries",
    "errors_seen",
    "total_cost"
  ];

  const escapeCsv = value =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

  const csv = [
    columns.join(","),
    ...rows.map(row =>
      columns.map(column => escapeCsv(row[column])).join(",")
    )
  ].join("\n");

  fs.writeFileSync(
    path.join(__dirname, "self_repair", "results.csv"),
    csv,
    "utf8"
  );

  console.log("\nResults saved to self_repair/results.csv");
}

main().catch(error => {
  console.error("Batch failed:", error.message);
  process.exitCode = 1;
});

