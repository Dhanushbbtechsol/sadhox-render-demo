import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import {
  CurrentUser,
  type AuthUser,
} from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import {
  CreateCatalogItemDto,
  UpdateCatalogItemDto,
} from "./dto/catalog-item.dto";
import { ServiceCatalogService } from "./service-catalog.service";

@ApiTags("service-catalog")
@ApiBearerAuth()
@Controller("service-catalog")
export class ServiceCatalogController {
  constructor(private readonly catalog: ServiceCatalogService) {}

  @Get()
  @Roles("Admin", "Agent", "EndUser")
  @ApiOperation({ summary: "List available service catalog items" })
  @ApiQuery({
    name: "includeInactive",
    required: false,
    description: "Admin only — include deactivated items",
  })
  list(
    @CurrentUser() user: AuthUser,
    @Query("includeInactive") includeInactive?: string,
  ) {
    const wantInactive =
      includeInactive === "true" || includeInactive === "1";
    return this.catalog.list({
      includeInactive: wantInactive && user.role === "Admin",
    });
  }

  @Post()
  @Roles("Admin")
  @HttpCode(201)
  @ApiOperation({ summary: "Create a service catalog item (Admin)" })
  create(@Body() dto: CreateCatalogItemDto) {
    return this.catalog.create(dto);
  }

  @Patch(":id")
  @Roles("Admin")
  @ApiOperation({
    summary: "Update or deactivate a service catalog item (Admin)",
  })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCatalogItemDto,
  ) {
    return this.catalog.update(id, dto);
  }
}
