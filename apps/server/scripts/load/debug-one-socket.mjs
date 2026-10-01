import "dotenv/config";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { io } from "socket.io-client";

const __dirname = dirname(fileURLToPath(import.meta.url));
const base = "http://127.0.0.1:3000";
const password = readFileSync(join(__dirname, "../../.seed-password"), "utf8").trim();
const login = await fetch(`${base}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "admin@sadhox.local", password }),
});
const { accessToken } = await login.json();
const list = await (await fetch(`${base}/incidents?page=1&pageSize=1`, {
  headers: { Authorization: `Bearer ${accessToken}` },
})).json();
const ticketId = list.data[0].id;
console.log("ticket", ticketId);

const socket = io(base, {
  auth: { token: accessToken },
  transports: ["websocket"],
});

await new Promise((resolve, reject) => {
  socket.on("connect", () => {
    console.log("connected", socket.id);
    socket.emit("join", { ticketId }, (res) => {
      console.log("join ack", res);
      resolve(res);
    });
  });
  socket.on("connect_error", reject);
  socket.on("exception", (e) => console.log("exception", e));
  socket.on("error", (e) => console.log("error event", e));
  setTimeout(() => reject(new Error("timeout")), 8000);
});
socket.disconnect();
process.exit(0);
