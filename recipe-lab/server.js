// Recipe Lab - tiny local server.
// It serves the web page in /public and forwards your food idea to Claude.
// Your API key stays on this computer (read from the .env file) and is never sent to the browser.

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, RECIPE_SCHEMA } from "./recipe-prompt.js";

const here = path.dirname(fileURLToPath(import.meta.url));

// ---- Load the .env file ---------------------------------------------------
try {
  process.loadEnvFile(path.join(here, ".env"));
} catch {
  // No .env file - we'll show a friendly message below.
}

const PORT = Number(process.env.PORT) || 3000;
const MODEL = "claude-opus-5-5";

if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.includes("paste-your-key")) {
  console.error(
    "\n  ⚠️  No API key found.\n" +
      "  Make a file named .env in the recipe-lab folder (copy .env.example)\n" +
      "  and put your key in it like this:\n\n" +
      "     ANTHROPIC_API_KEY=sk-ant-...\n\n" +
      "  Then run  npm start  again.\n"
  );
  process.exit(1);
}

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment

// ---- Recipe generation ----------------------------------------------------
async function generateRecipe(idea) {
  let message;
  try {
    message = await requestRecipe(idea, true);
  } catch (err) {
    // Safety net: if the fallback option is ever rejected, retry once without it.
    if (err instanceof Anthropic.BadRequestError && /fallback/i.test(err.message)) {
      message = await requestRecipe(idea, false);
    } else {
      throw err;
    }
  }
  return parseRecipe(message);
}

function requestRecipe(idea, withFallback) {
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    system: SYSTEM_PROMPT,
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: RECIPE_SCHEMA },
    },
    // If Claude's safety filter ever declines a request, the API retries it on a
    // recommended fallback model automatically.
    ...(withFallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" } : {}),
    messages: [
      {
        role: "user",
        content: `My food idea / craving: ${idea}\n\nTurn this into a full Recipe Lab recipe.`,
      },
    ],
  });
  return stream.finalMessage();
}

async function parseRecipe(message) {
  if (message.stop_reason === "refusal") {
    throw friendly(422, "Claude couldn't make a recipe from that idea. Try describing it a different way.");
  }
  if (message.stop_reason === "max_tokens") {
    throw friendly(502, "The recipe came back cut off. Please try again.");
  }

  const text = message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  try {
    return JSON.parse(text);
  } catch {
    throw friendly(502, "The recipe came back in a format the app couldn't read. Please try again.");
  }
}

function friendly(status, message) {
  const err = new Error(message);
  err.friendly = true;
  err.status = status;
  return err;
}

function explainError(err) {
  if (err.friendly) return { status: err.status, message: err.message };
  if (err instanceof Anthropic.AuthenticationError) {
    return { status: 401, message: "Your API key was rejected. Double-check the key in your .env file, then restart the app." };
  }
  if (err instanceof Anthropic.PermissionDeniedError) {
    return { status: 403, message: "Your API key doesn't have access to this model. Check your account in the Claude Console." };
  }
  if (err instanceof Anthropic.RateLimitError) {
    return { status: 429, message: "Too many requests right now (or your credit balance ran out). Wait a minute, or check your billing in the Claude Console." };
  }
  if (err instanceof Anthropic.BadRequestError) {
    const detail = err.error?.error?.message || err.message || "";
    if (/credit balance/i.test(detail)) {
      return { status: 402, message: "Your Claude account is out of credits. Add a few dollars in the Claude Console under Billing." };
    }
    return { status: 400, message: `Claude couldn't process that request: ${detail}` };
  }
  if (err instanceof Anthropic.InternalServerError) {
    return { status: 503, message: "Claude is busy or having a hiccup. Give it a minute and try again." };
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return { status: 503, message: "Couldn't reach Claude. Check your internet connection and try again." };
  }
  console.error(err);
  return { status: 500, message: "Something went wrong making your recipe. Please try again." };
}

// ---- Tiny web server ------------------------------------------------------
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
};

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 10_000) {
        reject(friendly(413, "That message is too long."));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

const publicDir = path.join(here, "public");

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "POST" && url.pathname === "/api/recipe") {
    try {
      const body = JSON.parse((await readBody(req)) || "{}");
      const idea = String(body.idea || "").trim();
      if (!idea) return sendJson(res, 400, { error: "Type a food idea first!" });
      if (idea.length > 1000) return sendJson(res, 400, { error: "Keep your idea under 1000 characters." });

      console.log(`🍳 Cooking up: ${idea}`);
      const recipe = await generateRecipe(idea);
      console.log(`✅ Done: ${recipe.title}`);
      return sendJson(res, 200, { recipe });
    } catch (err) {
      const { status, message } = explainError(err);
      console.error(`❌ ${message}`);
      return sendJson(res, status, { error: message });
    }
  }

  if (req.method !== "GET") {
    res.writeHead(405);
    return res.end();
  }

  // Static files
  const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(publicDir, requested));
  if (!filePath.startsWith(publicDir + path.sep)) {
    res.writeHead(403);
    return res.end();
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end("Not found");
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n  🧪 Recipe Lab is running!\n  Open this in your browser:  http://localhost:${PORT}\n  (Press Ctrl+C to stop.)\n`);
});
