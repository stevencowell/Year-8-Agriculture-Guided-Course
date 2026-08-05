import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".pdf": "application/pdf" };
http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const file = path.resolve(root, relative);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { response.writeHead(404); response.end("Not found"); return; }
  response.writeHead(200, { "Content-Type": types[path.extname(file).toLowerCase()] || "application/octet-stream" });
  fs.createReadStream(file).pipe(response);
}).listen(8881, "127.0.0.1", () => console.log("Year 8 Agriculture preview: http://127.0.0.1:8881/"));
