import { env } from "@sadhox/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";

import { authRoutes } from "./routes/auth";

const app = new Hono();

const allowedOrigins = new Set([
  env.CORS_ORIGIN,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

app.use(logger());
app.use(
  "/*",
  cors({
    origin: (origin) => (origin && allowedOrigins.has(origin) ? origin : env.CORS_ORIGIN),
    allowMethods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.get("/", (c) => {
  return c.text("OK");
});

app.route("/auth", authRoutes);

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
