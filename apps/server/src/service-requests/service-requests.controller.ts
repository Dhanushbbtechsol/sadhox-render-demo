import { Controller, Get, Param } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Roles } from "../common/decorators/roles.decorator";

@ApiTags("service-requests")
@ApiBearerAuth()
@Controller("service-requests")
export class ServiceRequestsController {
  @Get()
  @Roles("Admin", "Agent", "EndUser")
  @ApiOperation({ summary: "List service requests (stub)" })
  list() {
    return { data: [], message: "stub — business logic in later phase" };
  }

  @Get(":id")
  @Roles("Admin", "Agent", "EndUser")
  @ApiOperation({ summary: "Get service request by id (stub)" })
  get(@Param("id") id: string) {
    return { id, message: "stub" };
  }
}
