/**
 * Day 17 HTTP load: concurrent GET /incidents + POST /incidents ~100 req/s.
 *
 * Usage (from apps/server):
 *   SEED_PASSWORD=... node scripts/load/run-http-load.mjs
 *
 * Requires Nest with elevated throttle for the run, e.g.:
 *   THROTTLE_GLOBAL_LIMIT=20000 DB_POOL_MAX=25
 */
import "dotenv/config";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import autocannon from "autocannon";

const __dirname = dirname(fileURLToPath(import.meta.url));
const base = process.env.LOAD_BASE_URL ?? "http://127.0.0.1:3000";
const seedPath = join(__dirname, "../../.seed-password");
const password =
  process.env.SEED_PASSWORD ??
  (readFileSync(seedPath, "utf8").trim() || "");

if (!password) {
  console.error("SEED_PASSWORD or .seed-password required");
  process.exit(1);
}

const loginRes = await fetch(`${base}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "admin@sadhox.local", password }),
});
if (!loginRes.ok) {
  console.error("login failed", loginRes.status, await loginRes.text());
  process.exit(1);
}
const { accessToken } = await loginRes.json();
console.log("LOGIN_OK token_len=", accessToken.length);

const authHeaders = {
  Authorization: `Bearer ${accessToken}`,
  "Content-Type": "application/json",
};

function run(name, opts) {
  return new Promise((resolve, reject) => {
    const instance = autocannon(
      {
        url: base,
        connections: opts.connections ?? 20,
        overallRate: opts.rate ?? 100,
        duration: opts.duration ?? 15,
        headers: authHeaders,
        ...opts.extra,
      },
      (err, result) => {
        if (err) reject(err);
        else resolve({ name, result });
      },
    );
    autocannon.track(instance, { renderProgressBar: true });
  });
}

const list = await run("GET /incidents", {
  rate: 100,
  duration: 15,
  connections: 25,
  extra: {
    requests: [{ method: "GET", path: "/incidents?page=1&pageSize=20" }],
  },
});

const createBody = JSON.stringify({
  title: "Load test incident title",
  description: "Day 17 autocannon create payload — disposable.",
  category: "Other",
  impact: "Low",
  urgency: "Low",
});

const create = await run("POST /incidents", {
  rate: 50,
  duration: 10,
  connections: 15,
  extra: {
    requests: [
      {
        method: "POST",
        path: "/incidents",
        body: createBody,
      },
    ],
  },
});

function summarize({ name, result }) {
  const non2xx = result["non2xx"] ?? 0;
  const errors = result.errors ?? 0;
  const timeouts = result.timeouts ?? 0;
  return {
    name,
    requestsCompleted: result.requests?.total,
    avgReqPerSec: result.requests?.average,
    p99LatencyMs: result.latency?.p99,
    non2xx,
    errors,
    timeouts,
    statusCodeStats: result.statusCodeStats,
  };
}

const report = {
  at: new Date().toISOString(),
  base,
  list: summarize(list),
  create: summarize(create),
};

const out = join(__dirname, "http-load-results.json");
writeFileSync(out, JSON.stringify(report, null, 2));
console.log("\n=== SUMMARY ===");
console.log(JSON.stringify(report, null, 2));
console.log("wrote", out);

const listOk =
  report.list.errors === 0 &&
  report.list.non2xx === 0 &&
  (report.list.avgReqPerSec ?? 0) >= 80;
const createOk = report.create.errors === 0 && report.create.non2xx === 0;
process.exit(listOk && createOk ? 0 : 2);
