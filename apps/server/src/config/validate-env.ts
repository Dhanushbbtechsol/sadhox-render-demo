import { z } from "zod";

const emptyToUndefined = (v: unknown) =>
  v === "" || v === undefined || v === null ? undefined : v;

const envSchema = z
  .object({
    DATABASE_URL: z.string().min(1),
    CORS_ORIGIN: z.string().url(),
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
