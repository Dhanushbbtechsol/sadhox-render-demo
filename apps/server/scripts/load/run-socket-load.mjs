/**
 * Day 17 Socket.IO: 50+ concurrent room subscribers on one ticket room.
 *
 * Usage:
 *   SEED_PASSWORD=... node scripts/load/run-socket-load.mjs
 */
import "dotenv/config";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { io } from "socket.io-client";

const __dirname = dirname(fileURLToPath(import.meta.url));
const base = process.env.LOAD_BASE_URL ?? "http://127.0.0.1:3000";
const clientsN = Number(process.env.SOCKET_CLIENTS ?? 55);
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

const listRes = await fetch(`${base}/incidents?page=1&pageSize=1`, {
  headers: { Authorization: `Bearer ${accessToken}` },
});
if (!listRes.ok) {
  console.error("list failed", listRes.status, await listRes.text());
  process.exit(1);
}
const listJson = await listRes.json();
const ticketId = listJson.data?.[0]?.id;
if (!ticketId) {
  console.error("no incident to join");
  process.exit(1);
}
console.log("ticketId", ticketId, "clients", clientsN);

const sockets = [];
let connected = 0;
let joined = 0;
let errors = 0;

await new Promise((resolve) => {
  let settled = 0;
  const done = () => {
    settled += 1;
    if (settled >= clientsN) resolve(undefined);
  };

  for (let i = 0; i < clientsN; i++) {
    const socket = io(base, {
      auth: { token: accessToken },
      transports: ["websocket"],
      reconnection: false,
      timeout: 10_000,
    });
    sockets.push(socket);

    socket.on("connect", () => {
      connected += 1;
      socket
        .timeout(5000)
        .emit("join", { ticketId }, (err, res) => {
          if (err || !res?.ok) {
            errors += 1;
          } else {
            joined += 1;
          }
          done();
        });
    });
    socket.on("connect_error", () => {
      errors += 1;
      done();
    });
  }

  setTimeout(() => resolve(undefined), 20_000);
});

// Hold briefly to confirm sockets stay up
await new Promise((r) => setTimeout(r, 2000));
const stillConnected = sockets.filter((s) => s.connected).length;

for (const s of sockets) {
  s.disconnect();
}

const report = {
  at: new Date().toISOString(),
  base,
  ticketId,
  clientsN,
  connected,
  joined,
  stillConnectedAfter2s: stillConnected,
  errors,
};
const out = join(__dirname, "socket-load-results.json");
writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

process.exit(joined >= 50 && stillConnected >= 50 && errors === 0 ? 0 : 2);
