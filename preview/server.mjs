// Local preview server: node preview/server.mjs, then open http://localhost:5050
// Serves public/ like Firebase Hosting (every unknown path gets index.html) and swaps the
// Firebase SDK for preview/firebase-mock.js using an import map.
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..", "public");
const PORT = Number(process.env.PORT) || 5050;
const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
const modules = ["firebase-app", "firebase-firestore", "firebase-auth", "firebase-storage", "firebase-functions"];
const importMap = `<script type="importmap">${JSON.stringify({
  imports: Object.fromEntries(modules.map(m => [`${SDK}${m}.js`, "/__preview/firebase-mock.js"])),
})}</script>`;
const banner = `<div style="position:sticky;top:0;z-index:9;background:#713C4C;color:#FBF5F0;font:500 13px/1.5 Inter,system-ui,sans-serif;padding:8px 16px;text-align:center">
Local preview · sample content only · changes vanish on refresh · “Editor sign-in” in the footer shows the writing tools · Claude buttons work after deploying</div>`;
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".png": "image/png", ".json": "application/json" };

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  try {
    if (url.pathname === "/__/firebase/init.json") {
      res.writeHead(200, { "content-type": types[".json"] }).end("{}");
      return;
    }
    if (url.pathname === "/__preview/firebase-mock.js") {
      res.writeHead(200, { "content-type": types[".js"] }).end(await readFile(path.join(here, "firebase-mock.js")));
      return;
    }
    const file = path.normalize(path.join(root, decodeURIComponent(url.pathname)));
    if (file.startsWith(root) && path.extname(file) && path.basename(file) !== "index.html") {
      try {
        const body = await readFile(file);
        res.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream" }).end(body);
        return;
      } catch { /* fall through to index.html, like Firebase Hosting */ }
    }
    const html = (await readFile(path.join(root, "index.html"), "utf8"))
      .replace("</head>", `${importMap}\n</head>`)
      .replace("<body>", `<body>\n${banner}`);
    res.writeHead(200, { "content-type": types[".html"], "cache-control": "no-store" }).end(html);
  } catch (err) {
    res.writeHead(500).end(String(err));
  }
}).listen(PORT, () => console.log(`Nidhyakshar preview: http://localhost:${PORT}`));
