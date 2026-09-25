import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { AuthModule } from "./auth/auth.module";
import { AssetsModule } from "./assets/assets.module";
import { ChangesModule } from "./changes/changes.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { validateEnv } from "./config/validate-env";
import { DatabaseModule } from "./database/database.module";
import { HealthController } from "./health/health.controller";
import { IncidentsModule } from "./incidents/incidents.module";
import { ProblemsModule } from "./problems/problems.module";
import { ServiceRequestsModule } from "./service-requests/service-requests.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    DatabaseModule,
    AuthModule,
    IncidentsModule,
    ProblemsModule,
    ServiceRequestsModule,
    ChangesModule,
    AssetsModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
