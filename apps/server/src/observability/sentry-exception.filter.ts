import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";
import * as Sentry from "@sentry/node";

/**
 * Reports unhandled exceptions to Sentry when initialized.
 * Skips expected 4xx (401/403/404/validation); reports 5xx only.
 */
@Catch()
@Injectable()
export class SentryExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SentryExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
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
        `unhandled ${status} ${request.method} ${request.url?.split("?")[0]}`,
      );
    }

    const body =
      exception instanceof HttpException
        ? exception.getResponse()
        : { statusCode: status, message: "Internal server error" };

    if (!response.headersSent) {
      response.status(status).json(
        typeof body === "string" ? { statusCode: status, message: body } : body,
      );
    }
  }
}
