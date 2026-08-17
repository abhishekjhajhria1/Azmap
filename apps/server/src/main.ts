/**
 * The `node:http` adapter.
 *
 * Everything interesting lives in `app.ts`; this only turns HTTP into a plain
 * object and back. Keeping the transport this thin is what lets the same
 * routing run under a serverless handler, or inside a test, with no HTTP at
 * all.
 */

import { createServer } from "node:http";
import { App } from "./app.js";
import { Db } from "./db.js";

const PORT = Number(process.env.PORT ?? 8787);
const DB_PATH = process.env.ABH_DB ?? "abh.sqlite";
/** Comma-separated origins allowed to call this. Empty = same-origin only. */
const ORIGINS = (process.env.ABH_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);

const app = new App({ db: new Db(DB_PATH) });

const server = createServer(async (req, res) => {
  const origin = req.headers.origin;
  const allowed = origin && ORIGINS.includes(origin) ? origin : ORIGINS[0];
  if (allowed) {
    res.setHeader("Access-Control-Allow-Origin", allowed);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "content-type, authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Max-Age", "86400");
  }
  if (req.method === "OPTIONS") {
    res.writeHead(204).end();
    return;
  }

  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  let body: unknown = null;
  if (req.method === "POST") {
    try {
      body = JSON.parse(await readBody(req));
    } catch {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid JSON" }));
      return;
    }
  }

  const reply = await app.handle({
    method: req.method ?? "GET",
    path: url.pathname,
    query: url.searchParams,
    headers: req.headers as Record<string, string | undefined>,
    body,
    // Behind a proxy this is the only honest source of the client address.
    ip: String(req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? "unknown")
      .split(",")[0]!
      .trim(),
  });

  res.writeHead(reply.status, { "content-type": "application/json", ...reply.headers });
  res.end(JSON.stringify(reply.body));
});

function readBody(req: import("node:http").IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      // Refuse before buffering: an unbounded body is a denial-of-service.
      if (size > 8 * 1024 * 1024) {
        reject(new Error("Body too large"));
        req.destroy();
        return;
      }
      data += chunk;
    });
    req.on("end", () => resolve(data || "null"));
    req.on("error", reject);
  });
}

server.listen(PORT, () => {
  console.log(`abh relay listening on :${PORT} (db: ${DB_PATH})`);
});
