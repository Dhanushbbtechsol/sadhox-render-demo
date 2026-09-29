import { randomUUID } from "crypto";
import type { IncomingMessage, ServerResponse } from "http";
import { LoggerModule } from "nestjs-pino";
import { ConfigModule, ConfigService } from "@nestjs/config";

function readHeader(
  headers: IncomingMessage["headers"],
  name: string,
): string | undefined {
  const raw = headers[name];
  if (Array.isArray(raw)) return raw[0];
  return typeof raw === "string" ? raw : undefined;
}

export const loggerModule = LoggerModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    const nodeEnv = config.get<string>("NODE_ENV") ?? "development";
    const level = config.get<string>("LOG_LEVEL") ?? "info";
    const isDev = nodeEnv === "development";

    return {
      pinoHttp: {
        level,
        genReqId: (req: IncomingMessage, res: ServerResponse) => {
          const existing = readHeader(req.headers, "x-request-id");
          const id =
            existing && existing.trim().length > 0
              ? existing.trim()
              : randomUUID();
          res.setHeader("x-request-id", id);
          return id;
        },
        customProps: (req: IncomingMessage) => ({
          requestId: readHeader(req.headers, "x-request-id"),
        }),
        redact: {
          paths: [
            "req.headers.authorization",
            "req.headers.cookie",
            "req.headers[\"authorization\"]",
            "req.headers[\"cookie\"]",
            "password",
            "token",
            "refreshToken",
            "accessToken",
            "body.password",
            "body.token",
            "body.refreshToken",
            "body.accessToken",
            "*.password",
            "*.token",
            "*.refreshToken",
            "*.accessToken",
            "*.secret",
            "*.authorization",
            "*.cookie",
          ],
          censor: "[Redacted]",
        },
        transport: isDev
          ? {
              target: "pino-pretty",
              options: { singleLine: true, colorize: true },
            }
          : undefined,
        autoLogging: true,
      },
    };
  },
});
