import { io } from "socket.io-client";
import postgres from "postgres";

const BASE = process.env.API_URL ?? "http://127.0.0.1:3000";
const password = process.env.SEED_PASSWORD;
if (!password) {
  console.error("SEED_PASSWORD required");
  process.exit(1);
}

async function main() {
  // (d) x-request-id + liveness (no dependency leak)
  const healthRes = await fetch(`${BASE}/health`, {
    headers: { "x-request-id": "cp2-demo-1" },
  });
  const healthBody = await healthRes.json();
  console.log(
    "HEALTH",
    healthRes.status,
    "x-request-id=",
    healthRes.headers.get("x-request-id"),
    JSON.stringify(healthBody),
  );

  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: "admin@sadhox.local",
      password,
    }),
  });
  const login = await loginRes.json();
  console.log("LOGIN", loginRes.status, "hasToken=", Boolean(login.accessToken));
  const token = login.accessToken;
  if (!token) {
    console.error("No accessToken in login response", login);
    process.exit(1);
  }

  const readyRes = await fetch(`${BASE}/health/ready`, {
    headers: { authorization: `Bearer ${token}` },
  });
  console.log("READY", readyRes.status, JSON.stringify(await readyRes.json()));

  // (a) WS auth — socket.io fires connect before Nest can reject; settle on disconnect
  console.log("BAD", await wsSettle({ token: "bad.token" }));
  console.log("GOOD", await wsSettle({ token }));

  // (c) mutating POST → audit_log
  const postRes = await fetch(`${BASE}/service-requests`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      catalogId: "11111111-1111-4111-8111-111111111111",
      justification: "checkpoint2 audit",
      urgency: "Medium",
      fields: { laptopType: "Standard" },
    }),
  });
  console.log("POST_SR", postRes.status, (await postRes.text()).slice(0, 200));

  await new Promise((r) => setTimeout(r, 800));
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL required");
  const sql = postgres(dbUrl, { max: 1 });
  const rows = await sql`
    select action, entity_type, (actor_id is not null) as has_actor
    from audit_log
    order by created_at desc
    limit 5
  `;
  console.log("AUDIT", JSON.stringify(rows));
  await sql.end();

  // (b) redis bull keys
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) throw new Error("REDIS_URL required");
  const Redis = (await import("ioredis")).default;
  const redis = new Redis(redisUrl);
  const keys = await redis.keys("bull:sla-queue:*");
  console.log("REDIS_SLA_KEYS", keys.slice(0, 12).join(",") || "(none)");
  await redis.quit();
}

/** Wait until auth settles: stay connected (ok) or server disconnect (reject). */
function wsSettle(auth) {
  return new Promise((resolve) => {
    const s = io(BASE, {
      auth,
      transports: ["websocket"],
      timeout: 4000,
      forceNew: true,
      reconnection: false,
    });
    let settled = false;
    let sawConnect = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(t);
      s.removeAllListeners();
      s.close();
      resolve(result);
    };
    const t = setTimeout(() => {
      finish(sawConnect && s.connected ? "CONNECTED" : "TIMEOUT");
    }, 3000);
    s.on("connect", () => {
      sawConnect = true;
      setTimeout(() => {
        if (!settled && s.connected) finish("CONNECTED");
      }, 400);
    });
    s.on("disconnect", (reason) => {
      // Only treat as reject if the server kicked us (not our own close).
      if (sawConnect && reason === "io server disconnect") {
        finish(`REJECTED:${reason}`);
      }
    });
    s.on("connect_error", (e) => finish(`CONNECT_ERROR:${e.message}`));
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
