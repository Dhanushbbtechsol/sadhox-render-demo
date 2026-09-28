import { Module } from "@nestjs/common";
import { ServiceCatalogController } from "./service-catalog.controller";

@Module({ controllers: [ServiceCatalogController] })
export class ServiceCatalogModule {}
