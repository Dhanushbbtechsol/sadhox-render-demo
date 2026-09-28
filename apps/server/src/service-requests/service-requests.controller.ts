import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  CurrentUser,
  type AuthUser,
} from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { CreateServiceRequestDto } from "./dto/create-service-request.dto";
import { RejectRequesterOverridePipe } from "./pipes/reject-requester-override.pipe";
import { ServiceRequestsService } from "./service-requests.service";

@ApiTags("service-requests")
@ApiBearerAuth()
@Controller("service-requests")
export class ServiceRequestsController {
  constructor(private readonly serviceRequests: ServiceRequestsService) {}

  @Get()
  @Roles("Admin", "Agent", "EndUser")
  @ApiOperation({
    summary: "List service requests (EndUser sees own rows only)",
  })
  list(@CurrentUser() user: AuthUser) {
    return { data: this.serviceRequests.list(user) };
  }

  @Get(":id")
  @Roles("Admin", "Agent", "EndUser")
  @ApiOperation({
    summary: "Get service request by id (EndUser scoped to own rows)",
  })
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.serviceRequests.get(user, id);
  }

  @Post()
  @HttpCode(201)
  @Roles("Admin", "Agent", "EndUser")
  @ApiOperation({
    summary:
      "Submit a service request (requester taken from JWT; client requesterId rejected)",
  })
  create(
    @CurrentUser() user: AuthUser,
    @Body(RejectRequesterOverridePipe) dto: CreateServiceRequestDto,
  ) {
    return this.serviceRequests.create(user, dto);
  }
}
