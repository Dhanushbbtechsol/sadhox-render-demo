import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";
import type { Sql } from "postgres";
import { AdminModule } from "./admin/admin.module";
import { AssignmentModule } from "./assignment/assignment.module";
import { AuthModule } from "./auth/auth.module";
import { AssetsModule } from "./assets/assets.module";
import { ChangesModule } from "./changes/changes.module";
import { CommentsModule } from "./comments/comments.module";
import { AuditLogInterceptor } from "./common/audit/audit-log.interceptor";
import { HttpThrottlerGuard } from "./common/guards/http-throttler.guard";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { PostgresThrottlerStorage } from "./common/postgres-throttler.storage";
import { resolveThrottleGlobal } from "./common/throttle.constants";
import { validateEnv } from "./config/validate-env";
import { DRIZZLE } from "./database/database.constants";
import { DatabaseModule, type DrizzleDB } from "./database/database.module";
import { EventsModule } from "./events/events.module";
import { HealthModule } from "./health/health.module";
import { IncidentsModule } from "./incidents/incidents.module";
import { KnowledgeModule } from "./knowledge/knowledge.module";
import { MailModule } from "./mail/mail.module";
import { ObservabilityModule } from "./observability/observability.module";
import { ProblemsModule } from "./problems/problems.module";
import { ProjectsModule } from "./projects/projects.module";
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
      imports: [DatabaseModule, ConfigModule],
      inject: [DRIZZLE, ConfigService],
      useFactory: (db: DrizzleDB, config: ConfigService) => ({
        throttlers: [
          resolveThrottleGlobal({
            limit: config.get<number>("THROTTLE_GLOBAL_LIMIT"),
            ttl: config.get<number>("THROTTLE_GLOBAL_TTL_MS"),
          }),
        ],
        storage: new PostgresThrottlerStorage(
          (db as unknown as { $client: Sql }).$client,
        ),
      }),
    }),
    ObservabilityModule,
    AuthModule,
    AssignmentModule,
    EventsModule,
    QueuesModule,
    MailModule,
    HealthModule,
    IncidentsModule,
    ProblemsModule,
    KnowledgeModule,
    ProjectsModule,
    ServiceCatalogModule,
    ServiceRequestsModule,
    ChangesModule,
    CommentsModule,
    AssetsModule,
    AdminModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: HttpThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
  ],
})
export class AppModule {}
