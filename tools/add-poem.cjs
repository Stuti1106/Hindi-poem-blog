// Adds one poem to the live Firestore database using the Firebase CLI's sign-in.
// Usage (from the project folder, after "firebase login"):
//   node tools/add-poem.cjs content/poems/<poem>.json [--overwrite]
const fs = require("fs");
const path = require("path");
const os = require("os");

const LIB = path.join(os.homedir(), ".local/node/lib/node_modules/firebase-tools/lib");
const { getAccessToken } = require(path.join(LIB, "auth.js"));
const scopes = require(path.join(LIB, "scopes.js"));

const PROJECT = "nidhyakshar";
const file = process.argv[2];
const overwrite = process.argv.includes("--overwrite");
const poem = JSON.parse(fs.readFileSync(file, "utf8"));

const toValue = v =>
  typeof v === "boolean" ? { booleanValue: v } :
  v === null ? { nullValue: null } :
  { stringValue: String(v) };

(async () => {
  const store = JSON.parse(fs.readFileSync(path.join(os.homedir(), ".config/configstore/firebase-tools.json"), "utf8"));
  const refresh = store.tokens?.refresh_token;
  if (!refresh) throw new Error("Not signed in to the Firebase CLI.");
  const { access_token } = await getAccessToken(refresh, [scopes.CLOUD_PLATFORM, scopes.EMAIL, scopes.OPENID]);

  const now = new Date().toISOString();
  const { id, ...data } = poem;
  const fields = Object.fromEntries(
    Object.entries({ photoPath: "", photoUrl: "", ...data, createdAt: now, updatedAt: now }).map(([k, v]) => [k, toValue(v)]),
  );
  const base = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
  // Refuse to replace an existing poem unless --overwrite is given.
  const url = `${base}/poems/${encodeURIComponent(id)}${overwrite ? "" : "?currentDocument.exists=false"}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });
  const out = await res.json();
  if (!res.ok) { console.error("Failed:", res.status, JSON.stringify(out.error || out)); process.exit(1); }
  console.log("Saved:", out.name.split("/documents/")[1], "| title:", out.fields.title.stringValue, "| lines:", out.fields.body.stringValue.split("\n").filter(Boolean).length);
})().catch(e => { console.error(e.message || e); process.exit(1); });
