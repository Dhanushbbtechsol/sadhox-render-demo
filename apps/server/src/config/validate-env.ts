import { z } from "zod";

const emptyToUndefined = (v: unknown) =>
  v === "" || v === undefined || v === null ? undefined : v;

/** One URL or comma-separated allowlist (matches cors-io.adapter parsing). Never `*`. */
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
    if (!z.string().url().safeParse(part).success) {
      ctx.addIssue({
        code: "custom",
        message: `Invalid CORS_ORIGIN URL: ${part}`,
      });
    }
  }
});

const envSchema = z
  .object({
    DATABASE_URL: z.string().min(1),
    CORS_ORIGIN: corsOriginSchema,
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    JWT_ACCESS_SECRET: z.string().min(16),
    JWT_REFRESH_SECRET: z.string().min(16),
    PORT: z.coerce.number().int().positive().default(3000),
    REDIS_URL: z.string().url(),
    RESEND_API_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    MAIL_FROM: z.preprocess(emptyToUndefined, z.string().email().optional()),
    SENTRY_DSN: z.preprocess(emptyToUndefined, z.string().url().optional()),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),
    /** Cron for daily ticket auto-close (BullMQ job scheduler pattern). */
    AUTO_CLOSE_CRON: z.preprocess(
      emptyToUndefined,
      z.string().min(1).default("0 2 * * *"),
    ),
    /** Days a ticket stays Resolved before system auto-close. */
    AUTO_CLOSE_DAYS: z.coerce.number().int().positive().default(3),
    /** postgres.js pool size (Day 17 load tuning). */
    DB_POOL_MAX: z.coerce.number().int().positive().default(10),
    /** Raise for load tests only — default remains 100/min. */
    THROTTLE_GLOBAL_LIMIT: z.coerce.number().int().positive().default(100),
    THROTTLE_GLOBAL_TTL_MS: z.coerce.number().int().positive().default(60_000),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === "production" && !data.RESEND_API_KEY) {
      ctx.addIssue({
        code: "custom",
        path: ["RESEND_API_KEY"],
        message: "RESEND_API_KEY is required in production",
      });
    }
  });

export type AppEnv = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): AppEnv {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid environment: ${msg}`);
  }
  return parsed.data;
}
