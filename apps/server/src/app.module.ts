import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import type { Sql } from "postgres";
import { AuthModule } from "./auth/auth.module";
import { AssetsModule } from "./assets/assets.module";
import { ChangesModule } from "./changes/changes.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { PostgresThrottlerStorage } from "./common/postgres-throttler.storage";
import { validateEnv } from "./config/validate-env";
import { DRIZZLE } from "./database/database.constants";
import { DatabaseModule, type DrizzleDB } from "./database/database.module";
import { EventsModule } from "./events/events.module";
import { HealthController } from "./health/health.controller";
import { IncidentsModule } from "./incidents/incidents.module";
import { ProblemsModule } from "./problems/problems.module";
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
    EventsModule,
    AuthModule,
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
  ],
})
export class AppModule {}
