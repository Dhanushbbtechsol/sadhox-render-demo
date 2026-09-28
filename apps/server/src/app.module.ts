import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "./auth/auth.module";
import { AssetsModule } from "./assets/assets.module";
import { ChangesModule } from "./changes/changes.module";
import { AuditLogInterceptor } from "./common/audit/audit-log.interceptor";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { validateEnv } from "./config/validate-env";
import { DatabaseModule } from "./database/database.module";
import { EventsModule } from "./events/events.module";
import { HealthController } from "./health/health.controller";
import { IncidentsModule } from "./incidents/incidents.module";
import { MailModule } from "./mail/mail.module";
import { ObservabilityModule } from "./observability/observability.module";
import { ProblemsModule } from "./problems/problems.module";
import { QueuesModule } from "./queues/queues.module";
import { ServiceCatalogModule } from "./service-catalog/service-catalog.module";
import { ServiceRequestsModule } from "./service-requests/service-requests.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([
      {
        name: "default",
        ttl: 60_000,
        limit: 120,
      },
    ]),
    DatabaseModule,
    ObservabilityModule,
    AuthModule,
    EventsModule,
    QueuesModule,
    MailModule,
    IncidentsModule,
    ProblemsModule,
    ServiceCatalogModule,
    ServiceRequestsModule,
    ChangesModule,
    AssetsModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
  ],
})
export class AppModule {}
