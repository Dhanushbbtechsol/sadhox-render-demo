import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

type ImportMetaEnvRecord = Record<string, string | boolean | undefined>;

const isLocalHost = (hostname: string) =>
  hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";

/** Login sends credentials in the JSON body — production must use HTTPS. */
const serverUrlSchema = z
  .url()
  .default("http://localhost:3000")
  .superRefine((value, ctx) => {
    if (import.meta.env.DEV) return;
    try {
      const { protocol, hostname } = new URL(value);
      if (protocol === "https:") return;
      if (protocol === "http:" && isLocalHost(hostname)) return;
      ctx.addIssue({
        code: "custom",
        message: "VITE_SERVER_URL must use HTTPS in production builds",
      });
    } catch {
      ctx.addIssue({ code: "custom", message: "Invalid VITE_SERVER_URL" });
    }
  });

export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_SERVER_URL: serverUrlSchema,
  },
  runtimeEnv: (import.meta as ImportMeta & { env: ImportMetaEnvRecord }).env,
  emptyStringAsUndefined: true,
});
