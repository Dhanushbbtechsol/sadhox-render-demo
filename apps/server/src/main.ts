import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Logger } from "nestjs-pino";
import cookieParser = require("cookie-parser");
import helmet from "helmet";
import { AppModule } from "./app.module";
import {
  CorsIoAdapter,
  sharedCorsOptions,
} from "./common/cors-io.adapter";
import { RejectRequesterOverridePipe } from "./service-requests/pipes/reject-requester-override.pipe";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  const config = app.get(ConfigService);
  const nodeEnv = config.get<string>("NODE_ENV") ?? "development";
  const isProd = nodeEnv === "production";
  // Same origin for HTTP + Socket.IO; getOrThrow / sharedCorsOptions fail closed (no "*").
  const cors = sharedCorsOptions(config.getOrThrow<string>("CORS_ORIGIN"));

  app.use(
    helmet({
      contentSecurityPolicy: isProd,
      hsts: isProd
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
    }),
  );
  app.useWebSocketAdapter(new CorsIoAdapter(app, cors.origin));
  app.use(cookieParser());
  const expressApp = app.getHttpAdapter().getInstance() as {
    set: (key: string, value: number | boolean) => void;
  };
  expressApp.set("trust proxy", isProd ? 1 : false);
  app.enableCors(cors);
  app.useGlobalPipes(
    new RejectRequesterOverridePipe(),
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  if (!isProd) {
    const swagger = new DocumentBuilder()
      .setTitle("Yukti API")
      .setDescription("ITSM platform API — Phase 1–2 foundation contract")
      .setVersion("0.2.0")
      .addBearerAuth()
      .addCookieAuth("refresh_token")
      .build();
    const document = SwaggerModule.createDocument(app, swagger);
    SwaggerModule.setup("docs", app, document);
  }

  const port = config.get<number>("PORT") ?? 3000;
  await app.listen(port);
  const logger = app.get(Logger);
  logger.log(`Server is running on http://localhost:${port}`);
  if (!isProd) {
    logger.log(`Swagger docs at http://localhost:${port}/docs`);
  }
}

bootstrap();
