import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from "@nestjs/common";
import { BaseWsExceptionFilter, WsException } from "@nestjs/websockets";
import type { Request, Response } from "express";
import * as Sentry from "@sentry/node";
import {
  DATABASE_UNAVAILABLE_BODY,
  DATABASE_UNAVAILABLE_RETRY_AFTER,
  isDatabaseUnavailableError,
} from "../common/database-unavailable";

/**
 * Reports unhandled exceptions to Sentry when initialized.
 * Skips expected 4xx (401/403/404/validation); reports 5xx only.
 *
 * Maps database-unavailable driver errors (by code, cause chain) to a generic
 * 503 + Retry-After — no host, stack, or SQL in the body.
 *
 * HTTP-only response shaping. WS must not go through Express `res.status()`
 * (that mangled gateway errors into opaque "Internal server error").
 */
const EXPECTED_WS_AUTH_MESSAGES = new Set([
  "unauthorized",
  "missing access token",
  "invalid or expired access token",
  "invalid access token payload",
  "forbidden: enduser may only join rooms for their own tickets",
  "forbidden: ticket room join denied",
  "invalid payload",
]);

/** Expected socket auth/ACL denials are client errors, not incidents. */
export function isExpectedWsAuthDenial(exception: unknown): boolean {
  if (!(exception instanceof WsException) && !(exception instanceof Error)) {
    return false;
  }
  return EXPECTED_WS_AUTH_MESSAGES.has(exception.message.toLowerCase());
}

@Catch()
@Injectable()
export class SentryExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SentryExceptionFilter.name);
  private readonly wsFilter = new BaseWsExceptionFilter();

  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() === "ws") {
      if (process.env.SENTRY_DSN && !isExpectedWsAuthDenial(exception)) {
        Sentry.captureException(exception);
      }
      this.wsFilter.catch(exception, host);
      return;
    }

    if (host.getType() !== "http") {
      return;
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const dbUnavailable = isDatabaseUnavailableError(exception);

    const status = dbUnavailable
      ? HttpStatus.SERVICE_UNAVAILABLE
      : exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const shouldReport =
      status >= 500 && Boolean(process.env.SENTRY_DSN);
    if (shouldReport) {
      Sentry.withScope((scope) => {
        scope.setTag("path", request.url?.split("?")[0] ?? "unknown");
        scope.setTag("method", request.method ?? "unknown");
        scope.setExtra(
          "requestId",
          request.headers["x-request-id"] ?? response.getHeader("x-request-id"),
        );
        Sentry.captureException(exception);
      });
    } else if (status >= 500) {
      this.logger.error(
        `unhandled ${status} ${request.method} ${request.url?.split("?")[0]}: ${
          exception instanceof Error ? exception.message : String(exception)
        }`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const body = dbUnavailable
      ? { ...DATABASE_UNAVAILABLE_BODY }
      : exception instanceof HttpException
        ? exception.getResponse()
        : { statusCode: status, message: "Internal server error" };

    if (!response.headersSent) {
      if (dbUnavailable) {
        response.setHeader("Retry-After", DATABASE_UNAVAILABLE_RETRY_AFTER);
      }
      response.status(status).json(
        typeof body === "string" ? { statusCode: status, message: body } : body,
      );
    }
  }
}
