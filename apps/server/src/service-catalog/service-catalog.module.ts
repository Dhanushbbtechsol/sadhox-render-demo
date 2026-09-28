import { Module, OnModuleInit } from "@nestjs/common";
import { ServiceCatalogController } from "./service-catalog.controller";
import { ServiceCatalogService } from "./service-catalog.service";

@Module({
  controllers: [ServiceCatalogController],
  providers: [ServiceCatalogService],
  exports: [ServiceCatalogService],
})
export class ServiceCatalogModule implements OnModuleInit {
  constructor(private readonly catalog: ServiceCatalogService) {}

  async onModuleInit() {
    try {
      await this.catalog.ensureSeeded();
    } catch (error) {
      console.warn(
        "[service-catalog] seed skipped (database may be unavailable):",
        error instanceof Error ? error.message : error,
      );
    }
  }
}
