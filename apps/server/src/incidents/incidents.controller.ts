import { Controller, Get, Param } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Roles } from "../common/decorators/roles.decorator";

@ApiTags("incidents")
@ApiBearerAuth()
@Controller("incidents")
export class IncidentsController {
  @Get()
  @Roles("Admin", "Agent", "EndUser")
  @ApiOperation({ summary: "List incidents (stub)" })
  list() {
    return { data: [], message: "stub — business logic in later phase" };
  }

  @Get(":id")
  @Roles("Admin", "Agent", "EndUser")
  @ApiOperation({ summary: "Get incident by id (stub)" })
  get(@Param("id") id: string) {
    return { id, message: "stub" };
  }
}
