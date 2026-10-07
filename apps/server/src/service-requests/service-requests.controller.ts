import {
  Body,
  Controller,
  Get,
  HttpCode,
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
  FulfillServiceRequestDto,
  RejectServiceRequestDto,
} from "./dto/service-request.dto";
import { RejectRequesterOverridePipe } from "./pipes/reject-requester-override.pipe";
import { ServiceRequestsService } from "./service-requests.service";

@ApiTags("service-requests")
@ApiBearerAuth()
@Controller("service-requests")
export class ServiceRequestsController {
  constructor(private readonly requests: ServiceRequestsService) {}

  @Get()
  @Roles("Admin", "Agent", "EndUser", "Manager")
  @ApiOperation({
    summary:
      "List service requests (EndUser: own; Manager: owned projects; Agent: member + unscoped; Admin: all)",
  })
  list(@CurrentUser() user: AuthUser) {
    return this.requests.list(user);
  }

  @Post()
  @HttpCode(201)
  @Roles("Admin", "Agent", "EndUser", "Manager")
  @ApiOperation({
    summary:
      "Submit a service request (optional projectId/moduleId; requester from JWT)",
  })
  create(
    @CurrentUser() user: AuthUser,
    @Body(RejectRequesterOverridePipe) dto: CreateServiceRequestDto,
  ) {
    return this.requests.create(user, dto);
  }

  @Get(":id")
  @Roles("Admin", "Agent", "EndUser", "Manager")
  @ApiOperation({
    summary: "Get service request by id (project-scoped for Manager/Agent)",
  })
  get(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.requests.get(user, id);
  }

  @Patch(":id/approve")
  @Roles("Admin", "Manager")
  @ApiOperation({
    summary:
      "Approve a submitted service request (Admin any; Manager own project only; null project Admin-only)",
  })
  approve(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.requests.approve(user, id);
  }

  @Patch(":id/reject")
  @Roles("Admin", "Manager")
  @ApiOperation({
    summary:
      "Reject a submitted service request (Admin any; Manager own project only)",
  })
  reject(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: RejectServiceRequestDto,
  ) {
    return this.requests.reject(user, id, dto);
  }

  @Patch(":id/start-fulfillment")
  @Roles("Admin", "Agent")
  @ApiOperation({
    summary:
      "Start fulfillment after Admin approval (Approved → In Fulfillment)",
  })
  startFulfillment(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.requests.startFulfillment(user, id);
  }

  @Patch(":id/fulfill")
  @Roles("Admin", "Agent")
  @ApiOperation({
    summary:
      "Complete fulfillment with notes (In Fulfillment → Fulfilled)",
  })
  fulfill(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: FulfillServiceRequestDto,
  ) {
    return this.requests.fulfill(user, id, dto);
  }
}
