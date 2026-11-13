import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import fs from "node:fs/promises";

const MODEL = "gemini-3.5-flash-lite";
const MAX_RETRIES = 3;
const SC_REPEATS = 5;
const INPUT_PRICE_PER_MILLION = 0.30;
const OUTPUT_PRICE_PER_MILLION = 2.50;

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY missing in .env");
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { timeout: 30000 }
});

const scenarios = (await fs.readFile("cot/scenarios.jsonl", "utf8")).replace(/^\uFEFF/, "")
  .split(/\r?\n/)
  .filter(Boolean)
  .map(line => JSON.parse(line));

if (scenarios.length !== 15) {
  throw new Error(`Expected 15 scenarios, found ${scenarios.length}`);
}

const [directTemplate, cotTemplate, scTemplate] = await Promise.all([
  fs.readFile("cot/prompts/direct.txt", "utf8"),
  fs.readFile("cot/prompts/cot.txt", "utf8"),
  fs.readFile("cot/prompts/sc.txt", "utf8")
]);

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function getPrompt(template, scenario) {
  const { ground_truth, ...publicScenario } = scenario;
  return template.replace(
    "{{SCENARIO}}",
    JSON.stringify(publicScenario, null, 2)
  );
}

function parseDecision(text) {
  const decisionMatch = text.match(/Decision\s*:\s*(YES|NO)\b/i);

  if (decisionMatch) {
    return decisionMatch[1].toUpperCase();
  }

  const matches = [...text.matchAll(/\b(YES|NO)\b/gi)];

  if (matches.length === 0) {
    throw new Error(`Could not parse YES/NO from: ${text}`);
  }

  return matches[matches.length - 1][1].toUpperCase();
}

function calculateCost(inputTokens, outputTokens) {
  return (
    inputTokens * INPUT_PRICE_PER_MILLION / 1_000_000 +
    outputTokens * OUTPUT_PRICE_PER_MILLION / 1_000_000
  );
}

async function callGemini(prompt, temperature, label) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`${label} | API attempt ${attempt}/${MAX_RETRIES}`);

      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: { temperature }
      });

      const usage = response.usageMetadata || {};
      const inputTokens = usage.promptTokenCount || 0;
      const outputTokens = usage.candidatesTokenCount || 0;
      const answer = response.text || "";

      if (!answer.trim()) {
        throw new Error("Gemini returned an empty response.");
      }

      return {
        answer: parseDecision(answer),
        raw: answer,
        inputTokens,
        outputTokens,
        cost: calculateCost(inputTokens, outputTokens)
      };
    } catch (error) {
      const message = String(error.message || error);
      const retryable = /429|503|504|timeout|temporarily unavailable/i.test(message);

      if (!retryable || attempt === MAX_RETRIES) {
        throw error;
      }

      const retryAfterMatch = message.match(/retry in ([\d.]+)s/i);

      const delay = retryAfterMatch
        ? Math.ceil(Number(retryAfterMatch[1]) * 1000) + 1000
        : 1000 * (2 ** (attempt - 1));

      console.log(`Retrying after ${delay}ms`);
      await sleep(delay);
    }
  }
}

function csvEscape(value) {
  const text = String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function accuracy(rows, answerKey) {
  return rows.filter(row => row[answerKey] === row.ground_truth).length;
}

let results = [];

try {
  results = JSON.parse(
    await fs.readFile("cot/progress.json", "utf8")
  );
  console.log(`Resuming: ${results.length} scenarios already completed.`);
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  console.log("Starting a fresh experiment.");
}

console.log("Starting CoT experiment");
console.log(`Model: ${MODEL}`);
console.log(`Scenarios: ${scenarios.length}`);
console.log(`Planned API calls: ${scenarios.length * (2 + SC_REPEATS)}`);
console.log("No API calls have been skipped or simulated.");

for (const scenario of scenarios) {
  if (results.some(row => row.scenario_id === scenario.scenario_id)) {
    console.log(`Skipping completed ${scenario.scenario_id}`);
    continue;
  }
  console.log(`\nProcessing ${scenario.scenario_id}`);

  const directPrompt = getPrompt(directTemplate, scenario);
  const cotPrompt = getPrompt(cotTemplate, scenario);
  const scPrompt = getPrompt(scTemplate, scenario);

  const direct = await callGemini(
    directPrompt, 0, `${scenario.scenario_id} DIRECT`
  );
  await sleep(5000);

  const cot = await callGemini(
    cotPrompt, 0, `${scenario.scenario_id} COT`
  );
  await sleep(5000);

  const scRuns = [];

  for (let i = 1; i <= SC_REPEATS; i++) {
    scRuns.push(
      await callGemini(scPrompt, 0.7, `${scenario.scenario_id} SC ${i}/5`)
    );
    await sleep(5000);
  }

  const yesVotes = scRuns.filter(run => run.answer === "YES").length;
  const noVotes = scRuns.length - yesVotes;
  const scAnswer = yesVotes > noVotes ? "YES" : "NO";

  const scInputTokens = scRuns.reduce((sum, run) => sum + run.inputTokens, 0);
  const scOutputTokens = scRuns.reduce((sum, run) => sum + run.outputTokens, 0);
  const scCost = scRuns.reduce((sum, run) => sum + run.cost, 0);

  results.push({
    scenario_id: scenario.scenario_id,
    ground_truth: scenario.ground_truth,
    direct_answer: direct.answer,
    direct_correct: direct.answer === scenario.ground_truth,
    cot_answer: cot.answer,
    cot_correct: cot.answer === scenario.ground_truth,
    sc_answer: scAnswer,
    sc_correct: scAnswer === scenario.ground_truth,
    direct_cost_usd: direct.cost,
    cot_cost_usd: cot.cost,
    sc_cost_usd: scCost
  });

  await fs.writeFile(
    "cot/progress.json",
    JSON.stringify(results, null, 2),
    "utf8"
  );

  console.log(
    `Direct=${direct.answer}, CoT=${cot.answer}, ` +
    `SC=${scAnswer} (${yesVotes} YES / ${noVotes} NO)`
  );
}

const columns = [
  "scenario_id",
  "direct_answer",
  "direct_correct",
  "cot_answer",
  "cot_correct",
  "sc_answer",
  "sc_correct",
  "direct_cost_usd",
  "cot_cost_usd",
  "sc_cost_usd"
];

const csvLines = [
  columns.join(","),
  ...results.map(row =>
    columns.map(column => csvEscape(
      typeof row[column] === "number"
        ? row[column].toFixed(10)
        : row[column]
    )).join(",")
  )
];

await fs.writeFile(
  "cot/results.csv",
  csvLines.join("\n") + "\n",
  "utf8"
);

const directCorrect = accuracy(results, "direct_answer");
const cotCorrect = accuracy(results, "cot_answer");
const scCorrect = accuracy(results, "sc_answer");

const totalCost = key =>
  results.reduce((sum, row) => sum + row[key], 0);

const methods = [
  { name: "Direct", correct: directCorrect, cost: totalCost("direct_cost_usd") },
  { name: "CoT", correct: cotCorrect, cost: totalCost("cot_cost_usd") },
  { name: "Self-Consistency", correct: scCorrect, cost: totalCost("sc_cost_usd") }
];

console.log("\n========== EXPERIMENT SUMMARY ==========");
for (const method of methods) {
  const costPerCorrect = method.correct
    ? method.cost / method.correct
    : null;

  console.log(
    `${method.name}: ${method.correct}/15 correct | ` +
    `Cost: $${method.cost.toFixed(8)} | ` +
    `Cost per correct: ${
      costPerCorrect === null ? "N/A" : "$" + costPerCorrect.toFixed(8)
    }`
  );
}

console.log("\nResults saved to cot/results.csv");
console.log(`Completed ${results.length} scenarios successfully.`);

// Generate the final decision report after the experiment.
const percentage = correct => ((correct / results.length) * 100).toFixed(2);

const bestMethod = [...methods].sort((a, b) => {
  if (b.correct !== a.correct) return b.correct - a.correct;

  const aCost = a.correct ? a.cost / a.correct : Infinity;
  const bCost = b.correct ? b.cost / b.correct : Infinity;

  return aCost - bCost;
})[0];

const reportLines = [
  "# CoT Experiment – Decision Rule",
  "",
  "## Experiment details",
  "",
  `- Model: ${MODEL}`,
  `- Scenarios: ${results.length}`,
  `- Planned API calls: ${results.length * (2 + SC_REPEATS)}`,
  "- Direct temperature: 0",
  "- CoT temperature: 0",
  "- Self-Consistency temperature: 0.7",
  "- Self-Consistency samples per scenario: 5",
  "- Cost: estimated using Standard paid-tier list pricing",
  "",
  "## Accuracy and cost comparison",
  "",
  "| Method | Correct | Accuracy | Total cost (USD) | Cost per correct answer (USD) |",
  "|---|---:|---:|---:|---:|",
  ...methods.map(method => {
    const costPerCorrect = method.correct
      ? (method.cost / method.correct).toFixed(8)
      : "N/A";

    return `| ${method.name} | ${method.correct}/${results.length} | ${percentage(method.correct)}% | $${method.cost.toFixed(8)} | ${costPerCorrect} |`;
  }),
  "",
  "## Decision rule",
  "",
  "1. Prefer the method with the highest measured accuracy.",
  "2. If two or more methods have equal accuracy, prefer the one with the lowest cost per correct answer.",
  "3. Use Self-Consistency only when its accuracy improvement justifies its additional API cost.",
  "4. Do not assume CoT or Self-Consistency is better; use the measured results.",
  "",
  `**Best method under this rule:** ${bestMethod.name}`,
  "",
  `It achieved ${bestMethod.correct}/${results.length} correct answers (${percentage(bestMethod.correct)}% accuracy).`,
  "",
  "## Limitations",
  "",
  "- Results are based on 15 scenarios only.",
  "- Self-Consistency uses majority voting over five independent responses.",
  "- Costs are estimates using published Standard paid-tier rates; actual billing may differ.",
  "- A larger and more diverse test set is needed before generalizing the result.",
  ""
];

await fs.writeFile(
  "cot/cot_decision_rule.md",
  reportLines.join("\n"),
  "utf8"
);

console.log("Decision report saved to cot/cot_decision_rule.md");



