import {
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { listCatalogForUser } from "../service-requests/request-store";

@ApiTags("service-catalog")
@ApiBearerAuth()
@Controller("service-catalog")
export class ServiceCatalogController {
  @Get()
  @Roles("Admin", "Agent", "EndUser")
  @ApiOperation({ summary: "List catalog items allowed for the caller" })
  list(@CurrentUser() user: AuthUser) {
    const result = listCatalogForUser({
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
  @ApiOperation({ summary: "Get a catalog item if allowed for the caller" })
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    const result = listCatalogForUser({
      id: user.userId,
      name: user.name,
      role: user.role,
    });
    if (!result.ok) {
      throw new ForbiddenException(result.error.message);
    }
    const item = result.data.find((entry) => entry.id === id);
    if (!item) {
      throw new NotFoundException("Catalog item not found");
    }
    return item;
  }
}
