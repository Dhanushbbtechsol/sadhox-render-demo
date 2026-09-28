import { Controller, Get, Param } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Roles } from "../common/decorators/roles.decorator";

@ApiTags("incidents")
@ApiBearerAuth()
@Controller("incidents")
export class IncidentsController {
  /** EndUser must not list/get via API until reporter filters exist (Phase 2+). */
  @Get()
  @Roles("Admin", "Agent")
  @ApiOperation({ summary: "List incidents (stub) — Admin/Agent only" })
  list() {
    return { data: [], message: "stub — business logic in later phase" };
  }

  @Get(":id")
  @Roles("Admin", "Agent")
  @ApiOperation({ summary: "Get incident by id (stub) — Admin/Agent only" })
  get(@Param("id") id: string) {
    return { id, message: "stub" };
  }
}
