import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Roles } from "../common/decorators/roles.decorator";
import { ServiceCatalogService } from "./service-catalog.service";

@ApiTags("service-catalog")
@ApiBearerAuth()
@Controller("service-catalog")
export class ServiceCatalogController {
  constructor(private readonly catalog: ServiceCatalogService) {}

  @Get()
  @Roles("Admin", "Agent", "EndUser")
  @ApiOperation({ summary: "List available service catalog items" })
  list() {
    return this.catalog.list();
  }
}
