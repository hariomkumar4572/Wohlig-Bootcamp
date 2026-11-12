
import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import fs from "node:fs/promises";

const MODEL = "gemini-3.5-flash-lite";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
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

async function classify(prompt, ticketText) {
  const finalPrompt = prompt.replace(
    "{{TICKET_TEXT}}",
    ticketText
  );

  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: finalPrompt
      });

      return normalizeCategory(response.text || "");
    } catch (error) {
      const message = String(error.message || error);

      if (
        attempt === 5 ||
        !/503|429|500|502|high demand|overloaded/i.test(message)
      ) {
        throw error;
      }

      const wait = attempt * 15000;

      console.log(`Temporary API error. Retrying in ${wait / 1000}s...`);
      await sleep(wait);
    }
  }
}

function csvEscape(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

const results = [];

for (const style of styles) {
  const prompt = await fs.readFile(style.file, "utf8");

  predictions.set(style.name, {});

  console.log(`\nStarting ${style.name} classification...`);

  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i];

    const prediction = await classify(
      prompt,
      ticket.ticket_text
    );

    predictions.get(style.name)[ticket.ticket_id] = prediction;

    console.log(
      `${style.name}: ${ticket.ticket_id} -> ${prediction}`
    );

    await sleep(12000);
  }
}

for (const ticket of tickets) {
  const zero = predictions.get("zero_shot")[ticket.ticket_id];
  const few = predictions.get("few_shot")[ticket.ticket_id];
  const role = predictions.get("role_based")[ticket.ticket_id];

  results.push({
    ticket_id: ticket.ticket_id,
    ticket_text: ticket.ticket_text,
    ground_truth: ticket.ground_truth,
    zero_shot_pred: zero,
    few_shot_pred: few,
    role_based_pred: role,
    zero_correct: zero === ticket.ground_truth,
    few_correct: few === ticket.ground_truth,
    role_correct: role === ticket.ground_truth
  });
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

const csv = [
  headers.join(","),
  ...results.map(row =>
    headers.map(header => csvEscape(row[header])).join(",")
  )
].join("\n");

await fs.writeFile(
  "prompting/styles_eval.csv",
  csv,
  "utf8"
);

console.log("\n========== ACCURACY REPORT ==========");

for (const [name, key] of [
  ["Zero-Shot", "zero_correct"],
  ["Few-Shot", "few_correct"],
  ["Role-Based", "role_correct"]
]) {
  const correct = results.filter(row => row[key]).length;
  const accuracy = (correct / tickets.length) * 100;

  console.log(
    `${name}: ${correct}/${tickets.length} = ${accuracy.toFixed(2)}%`
  );
}

console.log("\nCSV successfully saved!");
console.log("File: prompting/styles_eval.csv");
