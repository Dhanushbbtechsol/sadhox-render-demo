import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import {
  createServiceRequest,
  getServiceRequestForUser,
  listServiceRequestsForUser,
} from "./request-store";
import { CreateServiceRequestDto } from "./dto/create-service-request.dto";

@ApiTags("service-requests")
@ApiBearerAuth()
@Controller("service-requests")
export class ServiceRequestsController {
  @Get()
  @Roles("Admin", "Agent", "EndUser")
  @ApiOperation({ summary: "List service requests visible to the caller" })
  list(@CurrentUser() user: AuthUser) {
    const result = listServiceRequestsForUser({
      id: user.userId,
      name: user.name,
      role: user.role,
    });
    if (!result.ok) {
      throw new ForbiddenException(result.error.message);
    }
    return { data: result.data };
  }

  @Get(":id")
  @Roles("Admin", "Agent", "EndUser")
  @ApiOperation({ summary: "Get a service request if visible to the caller" })
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    const result = getServiceRequestForUser(
      { id: user.userId, name: user.name, role: user.role },
      id,
    );
    if (!result.ok) {
      if (result.error.status === 404) throw new NotFoundException(result.error.message);
      throw new ForbiddenException(result.error.message);
    }
    return result.data;
  }

  @Post()
  @HttpCode(201)
  @Roles("Admin", "Agent", "EndUser")
  @ApiOperation({
    summary: "Create a service request (requester taken from JWT, not body)",
  })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateServiceRequestDto) {
    const result = createServiceRequest(
      { id: user.userId, name: user.name, role: user.role },
      {
        catalogId: dto.catalogId,
        justification: dto.justification,
        urgency: dto.urgency,
        fields: dto.fields ?? {},
      },
    );
    if (!result.ok) {
      if (result.error.status === 403) throw new ForbiddenException(result.error.message);
      if (result.error.status === 404) throw new NotFoundException(result.error.message);
      throw new BadRequestException(result.error.message);
    }
    return result.data;
  }
}
