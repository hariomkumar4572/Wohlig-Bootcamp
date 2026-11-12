
import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import {
  readFile,
  writeFile,
  mkdir,
  access
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY missing in .env");
}

const ai = new GoogleGenAI({
  apiKey,
  httpOptions: { timeout: 30000 }
});

const MODEL = "gemini-3.5-flash-lite";

const tasks = {
  claim_summary: {
    name: "Claim Summary",
    files: ["claim_01.txt", "claim_02.txt", "claim_03.txt"]
  },
  product_rewrite: {
    name: "Product Rewrite",
    files: ["product_01.txt", "product_02.txt", "product_03.txt"]
  },
  email_triage: {
    name: "Email Triage",
    files: ["email_01.txt", "email_02.txt", "email_03.txt"]
  }
};

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function generateWithTimeout(input) {
  let timer;

  try {
    const request = ai.interactions.create({
      model: MODEL,
      input
    });

    return await Promise.race([
      request,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Request timed out after 30 seconds.")),
          30000
        );
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function generateWithRetry(input) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`API attempt ${attempt}/3`);
      return await generateWithTimeout(input);
    } catch (error) {
      const message = error.message || "";
      const status = error.status || error.statusCode;

      if (
        status === 429 ||
        /429|RESOURCE_EXHAUSTED|daily quota|rate limit/i.test(message)
      ) {
        const quotaError = new Error("Gemini quota limit reached.");
        quotaError.code = "QUOTA_LIMIT";
        throw quotaError;
      }

      const temporaryError =
        status === 503 ||
        /503|UNAVAILABLE|temporarily unavailable/i.test(message);

      if (!temporaryError || attempt === 3) {
        throw error;
      }

      const wait = attempt * 5000;

      console.log(`Temporary issue. Waiting ${wait / 1000} seconds...`);

      await new Promise(resolve => setTimeout(resolve, wait));
    }
  }
}

async function main() {
  const selectedTask = process.argv[2];

  if (!selectedTask || !tasks[selectedTask]) {
    console.log("Please select one task:");
    console.log("claim_summary");
    console.log("product_rewrite");
    console.log("email_triage");
    process.exitCode = 1;
    return;
  }

  const task = tasks[selectedTask];

  const baseDir = path.join(
    __dirname,
    "prompting",
    "applied",
    selectedTask
  );

  const prompt = await readFile(
    path.join(baseDir, "prompt.txt"),
    "utf8"
  );

  const inputDir = path.join(baseDir, "inputs");
  const outputDir = path.join(baseDir, "outputs");

  await mkdir(outputDir, { recursive: true });

  let successCount = 0;
  let skippedCount = 0;
  let failureCount = 0;

  console.log("\n========== APPLIED PROMPT TASK ==========");
  console.log(`Task: ${task.name}`);
  console.log(`Model: ${MODEL}`);

  for (const file of task.files) {
    const outputFile = file.replace(/\.txt$/i, "_output.txt");
    const outputPath = path.join(outputDir, outputFile);

    if (await fileExists(outputPath)) {
      console.log(`Skipping existing output: ${outputFile}`);
      skippedCount++;
      continue;
    }

    console.log(`\nProcessing: ${file}`);

    try {
      const input = await readFile(
        path.join(inputDir, file),
        "utf8"
      );

      const fullInput = `
${prompt}

## Actual Input

${input}

Follow the prompt instructions and return only the required output.
`;

      const response = await generateWithRetry(fullInput);
      const result = response.output_text?.trim();

      if (!result) {
        throw new Error("Gemini returned an empty response.");
      }

      await writeFile(
        outputPath,
        result + "\n",
        "utf8"
      );

      successCount++;
      console.log(`Saved: ${outputFile}`);

    } catch (error) {
      failureCount++;
      console.error(`Failed: ${file}`);
      console.error(error.message);

      if (error.code === "QUOTA_LIMIT") {
        console.log("\nQuota reached. Stopping this task.");
        break;
      }
    }
  }

  console.log("\n========== FINAL REPORT ==========");
  console.log(`Successful: ${successCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`Failed: ${failureCount}`);
}

main().catch(error => {
  console.error("Execution failed:", error.message);
  process.exitCode = 1;
});

