import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import Anthropic from "@anthropic-ai/sdk";

initializeApp();

// Set once with: firebase functions:secrets:set ANTHROPIC_API_KEY
const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

const REGION = "asia-south1"; // Mumbai
const claudeOptions = {
  region: REGION,
  secrets: [ANTHROPIC_API_KEY],
  timeoutSeconds: 300,
  memory: "512MiB",
  maxInstances: 3,
};

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/** Only signed-in people listed in the `editors` collection may spend API credit. */
async function requireEditor(request) {
  const token = request.auth?.token;
  if (!token?.email || token.email_verified !== true) {
    throw new HttpsError("unauthenticated", "Please sign in first.");
  }
  const editor = await getFirestore().doc(`editors/${token.email}`).get();
  if (!editor.exists) {
    throw new HttpsError("permission-denied", "This account is not an editor.");
  }
}

/** One Claude call that must come back as JSON matching `schema`. */
async function askClaude(content, schema) {
  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
  let response;
  try {
    response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "high", format: { type: "json_schema", schema } },
      messages: [{ role: "user", content }],
    });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      throw new HttpsError("resource-exhausted", "Too many requests. Try again in a minute.");
    }
    if (err instanceof Anthropic.AuthenticationError) {
      logger.error("Anthropic API key was rejected", { status: err.status });
      throw new HttpsError("internal", "The Claude API key is not valid.");
    }
    if (err instanceof Anthropic.BadRequestError) {
      logger.error("Claude rejected the request", { message: err.message });
      throw new HttpsError("invalid-argument", "Claude could not process this request.");
    }
    if (err instanceof Anthropic.APIError) {
      logger.error("Claude API error", { status: err.status, message: err.message });
      throw new HttpsError("unavailable", "Claude is not available right now. Try again shortly.");
    }
    throw err;
  }

  if (response.stop_reason === "refusal") {
    throw new HttpsError("failed-precondition", "Claude declined this request.");
  }
  if (response.stop_reason === "max_tokens") {
    throw new HttpsError("out-of-range", "The text was too long to finish in one go.");
  }
  const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  try {
    return JSON.parse(text);
  } catch {
    logger.error("Claude reply was not valid JSON", { text: text.slice(0, 500) });
    throw new HttpsError("internal", "Claude's reply could not be read.");
  }
}

const TRANSCRIBE_PROMPT = `This photo shows a handwritten page of Hindi poetry or prose by the poet Nidhi Shrivastava. It may also contain some English.
Transcribe it exactly in its original script: Hindi in Devanagari (keep nuqta forms such as ख़, ज़, फ़ when they are written), English in Latin letters.
Keep every line break as written and put a blank line between stanzas or paragraphs. Do not translate, correct, or add anything.
If a word is unreadable, write [?] in its place.
Put the title in "title" if one is written at the top (otherwise an empty string), and the rest of the text in "text".`;

export const transcribe = onCall(claudeOptions, async (request) => {
  await requireEditor(request);
  const { image, mediaType } = request.data || {};
  if (typeof image !== "string" || !image || !IMAGE_TYPES.has(mediaType)) {
    throw new HttpsError("invalid-argument", "Send a JPEG, PNG, WebP or GIF image.");
  }
  if (image.length > 7_000_000) {
    throw new HttpsError("invalid-argument", "The photo is too large.");
  }
  const result = await askClaude(
    [
      { type: "image", source: { type: "base64", media_type: mediaType, data: image } },
      { type: "text", text: TRANSCRIBE_PROMPT },
    ],
    {
      type: "object",
      properties: { title: { type: "string" }, text: { type: "string" } },
      required: ["title", "text"],
      additionalProperties: false,
    },
  );
  return { title: String(result.title || ""), text: String(result.text || "") };
});

export const translate = onCall(claudeOptions, async (request) => {
  await requireEditor(request);
  const { title = "", body, kind = "poem" } = request.data || {};
  if (typeof body !== "string" || !body.trim()) {
    throw new HttpsError("invalid-argument", "Write the Hindi original first.");
  }
  if (body.length > 30_000 || String(title).length > 500) {
    throw new HttpsError("invalid-argument", "The text is too long.");
  }
  const what = kind === "journal" ? "journal entry" : "poem";
  const prompt = `Translate this Hindi ${what} by the poet Nidhi Shrivastava into English for her bilingual poetry website.
Be faithful to the feeling and imagery, not only the literal words. Keep the same line and stanza breaks, one English line for each Hindi line.
Use simple, graceful, natural English. Do not add rhyme that is not in the original, and do not add notes or explanations.
Put the English title in "title" (an empty string if there is no Hindi title) and the translation in "translation".

Hindi title: ${title || "(none)"}

${body}`;
  const result = await askClaude([{ type: "text", text: prompt }], {
    type: "object",
    properties: { title: { type: "string" }, translation: { type: "string" } },
    required: ["title", "translation"],
    additionalProperties: false,
  });
  return { title: String(result.title || ""), translation: String(result.translation || "") };
});

/** sitemap.xml and robots.txt, built from the live poems so Google can find every page. */
export const seo = onRequest({ region: REGION, maxInstances: 2 }, async (req, res) => {
  const host = req.get("x-forwarded-host") || req.get("host");
  const origin = `https://${host}`;
  if (req.path === "/robots.txt") {
    res.set("Cache-Control", "public, max-age=86400").type("text/plain")
      .send(`User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`);
    return;
  }
  const snap = await getFirestore().collection("poems").get();
  const xmlEscape = (s) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]);
  const pages = ["/", "/poems", "/journal", "/about", "/contact", "/privacy",
    "/poems/love", "/poems/longing", "/poems/memories", "/poems/life", "/poems/self"]
    .map((p) => `<url><loc>${xmlEscape(origin + p)}</loc></url>`);
  for (const d of snap.docs) {
    const updated = d.get("updatedAt");
    pages.push(`<url><loc>${xmlEscape(`${origin}/poem/${d.id}`)}</loc>${updated ? `<lastmod>${xmlEscape(String(updated).slice(0, 10))}</lastmod>` : ""}</url>`);
  }
  res.set("Cache-Control", "public, max-age=3600").type("application/xml")
    .send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.join("\n")}\n</urlset>\n`);
});
