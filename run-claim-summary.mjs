
import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import {
  readFile,
  writeFile,
  mkdir
} from "node:fs/promises";
import path from "node:path";

// 1. Check API key without displaying it
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY missing in .env");
}

// 2. Initialize Gemini
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    timeout: 30000
  }
});

const model = "gemini-3.8-flash";

// 3. Project paths
const baseDir = "prompting/applied/claim_summary";
const promptPath = path.join(baseDir, "prompt.txt");
const inputDir = path.join(baseDir, "inputs");
const outputDir = path.join(baseDir, "outputs");

// 4. Gemini API with timeout and retry handling
async function generateWithRetry(input, attempts = 3) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      console.log(`Gemini API request: Attempt ${attempt}/${attempts}`);

      const response = await ai.interactions.create({
        model,
        input
      });

      return response;

    } catch (error) {
      const message = error.message || "";

      // Do not retry daily quota errors
      const dailyQuotaError =
        /per day|daily quota|retry in \d+h|requests per day/i.test(message);

      if (dailyQuotaError) {
        throw new Error(
          "Gemini daily quota exhausted. Wait for quota reset. No retry performed."
        );
      }

      // Retry only temporary server errors
      const temporaryError =
        /503|UNAVAILABLE|temporarily unavailable/i.test(message);

      if (!temporaryError || attempt === attempts) {
        throw error;
      }

      const wait = attempt * 5000;

      console.log(
        `Temporary API issue. Retrying in ${wait / 1000} seconds...`
      );

      await new Promise(resolve => setTimeout(resolve, wait));
    }
  }

  throw new Error("Gemini request failed after all attempts.");
}

// 5. Main processing function
async function main() {
  console.log("Starting Insurance Claim Summary...");
  console.log(`Model: ${model}`);

  await mkdir(outputDir, { recursive: true });

  const prompt = await readFile(promptPath, "utf8");

  const files = [
    "claim_01.txt",
    "claim_02.txt",
    "claim_03.txt"
  ];

  let successCount = 0;
  let failureCount = 0;

  // 6. Process claims one by one
  for (const file of files) {
    console.log(`\nProcessing ${file}...`);

    try {
      const claim = await readFile(
        path.join(inputDir, file),
        "utf8"
      );

      const fullInput = `
${prompt}

## Actual Claim Input

${claim}

Analyze this claim and return only the seven-field structured summary.
`;

      const response = await generateWithRetry(fullInput);

      const result = response.output_text?.trim();

      if (!result) {
        throw new Error("Gemini returned an empty response.");
      }

      const outputFile = file.replace(
        ".txt",
        "_output.txt"
      );

      await writeFile(
        path.join(outputDir, outputFile),
        result + "\n",
        "utf8"
      );

      successCount++;

      console.log(`Saved successfully: ${outputFile}`);
      console.log("\nGenerated Summary:\n");
      console.log(result);

    } catch (error) {
      failureCount++;

      console.error(`\nFailed ${file}:`);
      console.error(error.message);

      // Stop processing if daily quota is exhausted
      if (/daily quota exhausted/i.test(error.message)) {
        console.log(
          "\nStopping remaining claims because Gemini daily quota is exhausted."
        );
        break;
      }
    }
  }

  // 7. Final report
  console.log("\n========== FINAL REPORT ==========");
  console.log(`Successful claims: ${successCount}`);
  console.log(`Failed claims: ${failureCount}`);
  console.log("Claim Summary processing finished.");
}

main().catch(error => {
  console.error("Execution failed:", error.message);
  process.exitCode = 1;
});

