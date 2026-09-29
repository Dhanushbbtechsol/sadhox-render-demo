import { Module } from "@nestjs/common";
import { ServiceRequestsModule } from "../service-requests/service-requests.module";
import { ServiceCatalogController } from "./service-catalog.controller";

@Module({
  imports: [ServiceRequestsModule],
  controllers: [ServiceCatalogController],
})
export class ServiceCatalogModule {}
