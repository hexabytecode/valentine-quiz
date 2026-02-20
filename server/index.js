const express = require("express");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

dotenv.config();

const app = express();
const PORT = process.env.SERVER_PORT || 5005;
const OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS || 90000);
const allowedOrigins = (process.env.FRONTEND_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const promptDocPath = path.join(__dirname, "summary_prompt.md");
const promptDoc = fs.existsSync(promptDocPath)
  ? fs.readFileSync(promptDocPath, "utf8")
  : "";
const insidersPath = path.join(__dirname, "insiders.json");
const rawInsiders = fs.existsSync(insidersPath)
  ? JSON.parse(fs.readFileSync(insidersPath, "utf8"))
  : [];

const normalizeAnswer = (input) => {
  if (!input) return "";
  let text = String(input).trim();

  const replacements = [
    [/\bI am\b/gi, "she is"],
    [/\bI'm\b/gi, "she's"],
    [/\bI’ve\b/gi, "she has"],
    [/\bI've\b/gi, "she has"],
    [/\bI’d\b/gi, "she would"],
    [/\bI'd\b/gi, "she would"],
    [/\bI'll\b/gi, "she will"],
    [/\bI’ll\b/gi, "she will"],
    [/\bI\b/gi, "she"],
    [/\bme\b/gi, "her"],
    [/\bmy\b/gi, "her"],
    [/\bmine\b/gi, "hers"],
    [/\bmyself\b/gi, "herself"],
  ];

  replacements.forEach(([pattern, replacement]) => {
    text = text.replace(pattern, replacement);
  });

  return text;
};

const normalizeInsiders = (insiders) => {
  if (!Array.isArray(insiders)) return [];
  return insiders.map((item) => ({
    id: item.id || undefined,
    raw: item.raw || "",
    normalized: item.normalized || normalizeAnswer(item.raw || ""),
    tags: Array.isArray(item.tags) ? item.tags : [],
    intensity: item.intensity || "mild",
  }));
};

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
    methods: ["GET", "POST", "OPTIONS"],
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/summarize", async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-5.1";

  if (!apiKey) {
    return res.status(500).json({
      error: "Missing OPENAI_API_KEY in server environment.",
    });
  }

  const { answers, questions, nickname } = req.body || {};

  if (!answers || typeof answers !== "object" || !Array.isArray(questions)) {
    return res.status(400).json({ error: "Invalid payload." });
  }

  const payload = questions
    .map((item) => ({
      question: item.prompt,
      answer_raw: String(answers[item.id] || "").trim(),
      answer_normalized: normalizeAnswer(answers[item.id] || ""),
    }))
    .filter((item) => item.answer_raw.length > 0);

  if (!payload.length) {
    return res.status(400).json({ error: "No answers to summarize." });
  }

  const prompt = {
    role: "user",
    content: [
      "You are writing a playful, teasing love note.",
      "Follow the style guide below exactly.",
      "",
      "Style Guide:",
      promptDoc || "(Missing style guide file.)",
      "",
      "Insiders are provided as objects with raw, normalized, tags, intensity.",
      "Use normalized text to help with POV, and paraphrase in the output.",
      "Avoid spicy insiders unless they naturally fit the tone.",
      "",
      "Use answer_normalized as the source of truth for pronouns and POV.",
      "Fix minor grammar/typos from the input naturally.",
      "Return JSON that matches the schema.",
      "",
      `Nickname to address (optional): ${nickname || ""}`,
      "Insiders (optional):",
      JSON.stringify(normalizeInsiders(rawInsiders), null, 2),
      "Answers:",
      JSON.stringify(payload, null, 2),
    ].join("\n"),
  };

  const body = {
    model,
    messages: [
      {
        role: "system",
        content:
          "You are a warm, poetic assistant who writes affectionate, respectful summaries.",
      },
      prompt,
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "valentine_summary",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            roast_note: { type: "string" },
            spirit_emoji: { type: "string" },
            spirit_line: { type: "string" },
            footer_line: { type: "string" },
            callbacks_used: {
              type: "array",
              items: { type: "string" },
              minItems: 0,
              maxItems: 4,
            },
          },
          required: [
            "roast_note",
            "spirit_emoji",
            "spirit_line",
            "footer_line",
            "callbacks_used",
          ],
        },
      },
    },
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
    let response;
    try {
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(500).json({
        error: "OpenAI request failed",
        details: errorText,
      });
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(500).json({ error: "No content in OpenAI response." });
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      return res.status(500).json({
        error: "Failed to parse OpenAI response.",
        raw: content,
      });
    }

    return res.json(parsed);
  } catch (err) {
    if (err?.name === "AbortError") {
      return res.status(504).json({
        error: "OpenAI request timed out",
        timeoutMs: OPENAI_TIMEOUT_MS,
      });
    }
    return res.status(500).json({
      error: "Server error while calling OpenAI.",
      details: err?.message || String(err),
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
