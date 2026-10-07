import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import {
  CurrentUser,
  type AuthUser,
} from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { CreateChangeDto, UpdateChangeDto } from "./dto/change.dto";
import { ChangesService } from "./changes.service";

@ApiTags("changes")
@ApiBearerAuth()
@Controller("changes")
export class ChangesController {
  constructor(private readonly changes: ChangesService) {}

  @Get()
  @Roles("Admin", "Agent", "Manager")
  @ApiOperation({ summary: "List changes with optional type/status filters" })
  @ApiQuery({ name: "type", required: false })
  @ApiQuery({ name: "status", required: false })
  list(
    @CurrentUser() user: AuthUser,
    @Query("type") type?: string,
    @Query("status") status?: string,
  ) {
    return this.changes.list(user, { type, status });
  }

  @Post()
  @Roles("Admin", "Agent")
  @ApiOperation({ summary: "Create a change record" })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateChangeDto) {
    return this.changes.create(user, dto);
  }

  @Get(":id")
  @Roles("Admin", "Agent")
  @ApiOperation({ summary: "Get change by id" })
  get(@Param("id", ParseUUIDPipe) id: string) {
    return this.changes.get(id);
  }

  @Patch(":id/approve")
  @Roles("Admin", "Manager")
  @ApiOperation({
    summary: "Approve a change (Admin; Manager owns ticket project)",
  })
  approve(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.changes.approve(user, id);
  }

  @Patch(":id")
  @Roles("Admin", "Agent")
  @ApiOperation({ summary: "Update change fields / status transition" })
  update(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateChangeDto,
  ) {
    return this.changes.update(user, id, dto);
  }
}
