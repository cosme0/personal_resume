/* ============================================================
   Tiny zero-dependency static server for local preview.

   Usage:  node server.js
   Then open http://localhost:5173
   ============================================================ */

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 5173;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json; charset=utf-8",
};

const server = http.createServer((req, res) => {
  let pathname;

  try {
    pathname = decodeURIComponent(
      new URL(req.url, `http://${req.headers.host || "localhost"}`).pathname
    );
  } catch {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("400 — Bad request");
    return;
  }

  if (pathname === "/") pathname = "/index.html";

  const filePath = path.resolve(ROOT, "." + pathname);

  if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("403 — Forbidden");
    return;
  }

  fs.stat(filePath, (error, stats) => {
    if (error || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 — Not found");
      return;
    }

    const type = MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";

    res.writeHead(200, {
      "Content-Type": type,
      "Content-Length": stats.size,
      "Cache-Control": "no-store",
    });

    if (req.method === "HEAD") {
      res.end();
      return;
    }

    fs.createReadStream(filePath)
      .on("error", () => res.destroy())
      .pipe(res);
  });
});

server.listen(PORT, () => {
  console.log("");
  console.log("  Portfolio dev server running:");
  console.log(`  http://localhost:${PORT}`);
  console.log("");
  console.log("  Press Ctrl+C to stop.");
  console.log("");
});
