

import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import fs from "node:fs/promises";

const MODEL = "gemini-3.5-flash-lite";
const MAX_RETRIES = 3;
const REQUEST_TIMEOUT = 30000;

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY missing in .env");
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    timeout: REQUEST_TIMEOUT
  }
});

const categories = [
  "Refund",
  "Shipping",
  "Login",
  "Payment",
  "Account",
  "Product Quality",
  "Order Change",
  "Other"
];

const tickets = JSON.parse(
  await fs.readFile("prompting/tickets.json", "utf8")
);

const styles = [
  {
    name: "zero_shot",
    file: "prompting/prompts/zero_shot.txt"
  },
  {
    name: "few_shot",
    file: "prompting/prompts/few_shot.txt"
  },
  {
    name: "role_based",
    file: "prompting/prompts/role_based.txt"
  }
];

const predictions = new Map();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizeCategory(text) {
  const cleaned = text.trim().replace(/^["']|["']$/g, "");

  return categories.find(
    category => category.toLowerCase() === cleaned.toLowerCase()
  ) || "INVALID";
}

function isQuotaError(error) {
  const message = String(error.message || error);
  const status = error.status || error.statusCode;

  return (
    status === 429 ||
    /429|RESOURCE_EXHAUSTED|quota|rate limit/i.test(message)
  );
}

async function classify(prompt, ticketText) {
  const finalPrompt = prompt.replace(
    "{{TICKET_TEXT}}",
    ticketText
  );

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`API attempt ${attempt}/${MAX_RETRIES}`);

      const response = await ai.models.generateContent({
        model: MODEL,
        contents: finalPrompt
      });

      return normalizeCategory(response.text || "");

    } catch (error) {
      const message = String(error.message || error);

      if (isQuotaError(error)) {
        const quotaError = new Error(
          "Gemini API quota exceeded. Stop evaluation."
        );
        quotaError.code = "QUOTA_LIMIT";
        throw quotaError;
      }

      const temporaryError =
        /503|500|502|UNAVAILABLE|high demand|overloaded/i.test(message);

      if (!temporaryError || attempt === MAX_RETRIES) {
        throw error;
      }

      const wait = attempt * 5000;

      console.log(
        `Temporary API issue. Retrying in ${wait / 1000}s...`
      );

      await sleep(wait);
    }
  }

  throw new Error("All retry attempts failed.");
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

const headers = [
  "ticket_id",
  "ticket_text",
  "ground_truth",
  "zero_shot_pred",
  "few_shot_pred",
  "role_based_pred",
  "zero_correct",
  "few_correct",
  "role_correct"
];

async function saveResults() {
  const rows = tickets.map(ticket => {
    const zero = predictions.get("zero_shot")?.[ticket.ticket_id];
    const few = predictions.get("few_shot")?.[ticket.ticket_id];
    const role = predictions.get("role_based")?.[ticket.ticket_id];

    return {
      ticket_id: ticket.ticket_id,
      ticket_text: ticket.ticket_text,
      ground_truth: ticket.ground_truth,
      zero_shot_pred: zero ?? "",
      few_shot_pred: few ?? "",
      role_based_pred: role ?? "",
      zero_correct: zero === undefined ? "" : zero === ticket.ground_truth,
      few_correct: few === undefined ? "" : few === ticket.ground_truth,
      role_correct: role === undefined ? "" : role === ticket.ground_truth
    };
  });

  const csv = [
    headers.join(","),
    ...rows.map(row =>
      headers.map(header => csvEscape(row[header])).join(",")
    )
  ].join("\n");

  await fs.writeFile(
    "prompting/styles_eval.csv",
    csv,
    "utf8"
  );

  console.log("CSV checkpoint saved.");
}

async function main() {
  let successCount = 0;
  let failureCount = 0;
  let quotaExceeded = false;

  console.log("Starting Prompt Evaluation");
  console.log(`Model: ${MODEL}`);
  console.log(`Tickets: ${tickets.length}`);
  console.log(`Planned API calls: ${tickets.length * styles.length}`);

  try {
    for (const style of styles) {
      const prompt = await fs.readFile(style.file, "utf8");

      predictions.set(style.name, {});

      console.log(`\nStarting ${style.name} classification...`);

      for (const ticket of tickets) {
        console.log(`Processing ${ticket.ticket_id}...`);

        try {
          const prediction = await classify(
            prompt,
            ticket.ticket_text
          );

          predictions.get(style.name)[ticket.ticket_id] = prediction;

          successCount++;

          console.log(
            `${style.name}: ${ticket.ticket_id} -> ${prediction}`
          );

          await saveResults();
          await sleep(12000);

        } catch (error) {
          failureCount++;

          console.error(
            `Failed ${ticket.ticket_id}: ${error.message}`
          );

          if (error.code === "QUOTA_LIMIT") {
            quotaExceeded = true;
            break;
          }

          throw error;
        }
      }

      if (quotaExceeded) {
        break;
      }
    }
  } finally {
    await saveResults();
  }

  console.log("\n========== FINAL REPORT ==========");
  console.log(`Successful predictions: ${successCount}`);
  console.log(`Failed requests: ${failureCount}`);
  console.log(`Quota exceeded: ${quotaExceeded}`);

  const totalPredictions = tickets.length * styles.length;
  const complete = successCount === totalPredictions;

  if (complete) {
    console.log("\n========== ACCURACY REPORT ==========");

    for (const [name, key] of [
      ["Zero-Shot", "zero_correct"],
      ["Few-Shot", "few_correct"],
      ["Role-Based", "role_correct"]
    ]) {
      const correct = tickets.filter(ticket => {
        const prediction = predictions.get(
          key === "zero_correct"
            ? "zero_shot"
            : key === "few_correct"
              ? "few_shot"
              : "role_based"
        )[ticket.ticket_id];

        return prediction === ticket.ground_truth;
      }).length;

      const accuracy = (correct / tickets.length) * 100;

      console.log(
        `${name}: ${correct}/${tickets.length} = ${accuracy.toFixed(2)}%`
      );
    }
  } else {
    console.log(
      "Evaluation incomplete. Accuracy report will be generated after all predictions finish."
    );
  }

  console.log("CSV: prompting/styles_eval.csv");
}

main().catch(error => {
  console.error("Evaluation stopped:", error.message);
  process.exitCode = 1;
});
