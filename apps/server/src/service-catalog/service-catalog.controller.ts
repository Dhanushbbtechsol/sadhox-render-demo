import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  CurrentUser,
  type AuthUser,
} from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ServiceRequestsService } from "../service-requests/service-requests.service";

@ApiTags("service-catalog")
@ApiBearerAuth()
@Controller("service-catalog")
export class ServiceCatalogController {
  constructor(private readonly serviceRequests: ServiceRequestsService) {}

  @Get()
  @Roles("Admin", "Agent", "EndUser")
  @ApiOperation({
    summary: "List catalog items allowed for the caller's role",
  })
  list(@CurrentUser() user: AuthUser) {
    return { data: this.serviceRequests.listCatalog(user) };
  }
}
