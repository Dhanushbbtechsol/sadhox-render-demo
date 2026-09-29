import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import type { Sql } from "postgres";
import { AdminModule } from "./admin/admin.module";
import { AssignmentModule } from "./assignment/assignment.module";
import { AuthModule } from "./auth/auth.module";
import { AssetsModule } from "./assets/assets.module";
import { ChangesModule } from "./changes/changes.module";
import { AuditLogInterceptor } from "./common/audit/audit-log.interceptor";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { PostgresThrottlerStorage } from "./common/postgres-throttler.storage";
import { validateEnv } from "./config/validate-env";
import { DRIZZLE } from "./database/database.constants";
import { DatabaseModule, type DrizzleDB } from "./database/database.module";
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
    DatabaseModule,
    ThrottlerModule.forRootAsync({
      imports: [DatabaseModule],
      inject: [DRIZZLE],
      useFactory: (db: DrizzleDB) => ({
        throttlers: [
          {
            name: "default",
            ttl: 60_000,
            limit: 120,
          },
        ],
        storage: new PostgresThrottlerStorage(
          (db as unknown as { $client: Sql }).$client,
        ),
      }),
    }),
    ObservabilityModule,
    AuthModule,
    EventsModule,
    QueuesModule,
    MailModule,
    AssignmentModule,
    IncidentsModule,
    ProblemsModule,
    ServiceCatalogModule,
    ServiceRequestsModule,
    ChangesModule,
    AssetsModule,
    AdminModule,
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
