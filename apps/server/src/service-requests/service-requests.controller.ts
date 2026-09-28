import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  CurrentUser,
  type AuthUser,
} from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import {
  CreateServiceRequestDto,
  RejectServiceRequestDto,
} from "./dto/service-request.dto";
import { ServiceRequestsService } from "./service-requests.service";

@ApiTags("service-requests")
@ApiBearerAuth()
@Controller("service-requests")
export class ServiceRequestsController {
  constructor(private readonly requests: ServiceRequestsService) {}

  @Get()
  @Roles("Admin", "Agent", "EndUser")
  @ApiOperation({
    summary: "List service requests (EndUser: own only; Admin/Agent: all)",
  })
  list(@CurrentUser() user: AuthUser) {
    return this.requests.list(user);
  }

  @Post()
  @Roles("Admin", "Agent", "EndUser")
  @ApiOperation({ summary: "Submit a new service request" })
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateServiceRequestDto,
  ) {
    return this.requests.create(user, dto);
  }

  @Get(":id")
  @Roles("Admin", "Agent", "EndUser")
  @ApiOperation({ summary: "Get service request by id" })
  get(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.requests.get(user, id);
  }

  @Patch(":id/approve")
  @Roles("Admin")
  @ApiOperation({ summary: "Approve a submitted service request (Admin)" })
  approve(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.requests.approve(user, id);
  }

  @Patch(":id/reject")
  @Roles("Admin")
  @ApiOperation({ summary: "Reject a submitted service request (Admin)" })
  reject(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: RejectServiceRequestDto,
  ) {
    return this.requests.reject(user, id, dto);
  }
}
