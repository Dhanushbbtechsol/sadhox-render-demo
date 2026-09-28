import { Global, Module, OnModuleDestroy, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { DRIZZLE } from "./database.constants";

export type DrizzleDB = PostgresJsDatabase<typeof schema>;

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: (config: ConfigService): DrizzleDB => {
        // Connection string comes only from validated env / secrets — never hardcode.
        const url = config.getOrThrow<string>("DATABASE_URL");
        const client = postgres(url, {
          max: 10,
          idle_timeout: 20,
          connect_timeout: 10,
        });
        return drizzle(client, { schema });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async onModuleDestroy() {
    const client = (this.db as unknown as { $client: postgres.Sql }).$client;
    if (client) {
      await client.end({ timeout: 5 });
    }
  }
}
