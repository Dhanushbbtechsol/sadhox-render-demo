import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/** One URL or comma-separated allowlist. Never `*`. */
const corsOriginSchema = z.string().min(1).superRefine((value, ctx) => {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "*") {
    ctx.addIssue({
      code: "custom",
      message: 'CORS_ORIGIN must be one or more URLs (never "*")',
    });
    return;
  }
  const parts = trimmed
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (parts.length === 0 || parts.some((part) => part === "*")) {
    ctx.addIssue({
      code: "custom",
      message: 'CORS_ORIGIN must be one or more URLs (never "*")',
    });
    return;
  }
  for (const part of parts) {
    if (!z.url().safeParse(part).success) {
      ctx.addIssue({
        code: "custom",
        message: `Invalid CORS_ORIGIN URL: ${part}`,
      });
    }
  }
});

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    CORS_ORIGIN: corsOriginSchema,
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    JWT_ACCESS_SECRET: z.string().min(16),
    JWT_REFRESH_SECRET: z.string().min(16),
    PORT: z.coerce.number().int().positive().default(3000),
    REDIS_URL: z.string().url().optional(),
    RESEND_API_KEY: z.string().optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});

export type ServerEnv = typeof env;
