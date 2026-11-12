require("dotenv").config();

const { ContactCardSchema } = require("./schema.js");

const MODEL = "gemini-3.5-flash-lite";
const MAX_RETRIES = 3;
const REQUEST_INTERVAL_MS = 5000;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let lastRequestAt = 0;

const responseSchema = {
  type: "OBJECT",
  properties: {
    name: { type: "STRING" },
    email: { type: "STRING" },
    phone: { type: "STRING" },
    address: {
      type: "OBJECT",
      properties: {
        city: { type: "STRING" },
        pincode: { type: "STRING" }
      },
      required: ["city", "pincode"]
    }
  },
  required: ["name", "email", "phone", "address"]
};

async function generateWithRateLimit(ai, prompt) {
  for (let retry = 0; retry <= 3; retry++) {
    const waitMs = Math.max(0, REQUEST_INTERVAL_MS - (Date.now() - lastRequestAt));
    if (waitMs > 0) await sleep(waitMs);

    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema }
      });
      lastRequestAt = Date.now();
      return response;
    } catch (error) {
      lastRequestAt = Date.now();
      const message = error.message || "";
      const is429 = message.includes("429") || message.includes("RESOURCE_EXHAUSTED");
      const is503 = message.includes("503") || message.includes("UNAVAILABLE");

      if ((!is429 && !is503) || retry === 3) throw error;

      let retryMs = is429
        ? ((Number(message.match(/retryDelay["']?\s*:\s*["']?(\d+)s/)?.[1]) || 32) + 3) * 1000
        : (retry + 1) * 5000;

      console.log(`Gemini temporary error. Retry ${retry + 1}/3 after ${retryMs / 1000}s...`);
      await sleep(retryMs);
    }
  }
}
async function repairLoop(originalInput) {
  const { GoogleGenAI } = await import("@google/genai");

  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY missing in .env");
  }

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
  });

  const sourcePincodeMatch = originalInput.match(
    /\b(\d{6})\b/
  );

  if (!sourcePincodeMatch) {
    return {
      data: null,
      first_try_valid: false,
      final_valid: false,
      num_retries: 0,
      errors_seen: ["Original input does not contain a valid pincode. Do not invent one."],
      input_tokens: 0,
      output_tokens: 0
    };
  }

  let previousOutput = "";
  let previousError = "";
  const errorsSeen = [];
  let inputTokens = 0;
  let outputTokens = 0;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const prompt = attempt === 0
      ? `Extract contact details from this input. Use only supplied information. Do not invent missing details. Return JSON only.\n\nInput:\n${originalInput}`
      : `Correct your previous JSON response.\n\nOriginal input:\n${originalInput}\n\nPrevious response:\n${previousOutput}\n\nValidation errors:\n${previousError}\n\nReturn corrected JSON only. Do not invent missing information.`;

    const response = await generateWithRateLimit(ai, prompt);

    previousOutput = response.text || "";

    const usage = response.usageMetadata || {};
    inputTokens += usage.promptTokenCount || 0;
    outputTokens += usage.candidatesTokenCount || 0;

    let parsed;

    try {
      parsed = JSON.parse(previousOutput);
    } catch (error) {
      previousError = `Invalid JSON: ${error.message}`;
      errorsSeen.push(previousError);
      console.log(`Attempt ${attempt + 1} failed: ${previousError}`);
      continue;
    }

    if (parsed.address?.pincode !== sourcePincodeMatch[1]) {
      previousError = "Returned pincode does not match the original input.";
      errorsSeen.push(previousError);
      console.log(`Attempt ${attempt + 1} failed: ${previousError}`);
      continue;
    }

    const validation = ContactCardSchema.safeParse(parsed);

    if (validation.success) {
      return {
        data: validation.data,
        first_try_valid: attempt === 0,
        final_valid: true,
        num_retries: attempt,
        errors_seen: errorsSeen,
        input_tokens: inputTokens,
        output_tokens: outputTokens
      };
    }

    previousError = validation.error.issues
      .map(issue => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");

    errorsSeen.push(previousError);
    console.log(`Attempt ${attempt + 1} failed: ${previousError}`);
  }

  return {
    data: null,
    first_try_valid: false,
    final_valid: false,
    num_retries: MAX_RETRIES,
    errors_seen: errorsSeen,
    input_tokens: inputTokens,
    output_tokens: outputTokens
  };
}

module.exports = { repairLoop };









