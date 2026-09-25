import { Controller, Get, Param } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Roles } from "../common/decorators/roles.decorator";

@ApiTags("changes")
@ApiBearerAuth()
@Controller("changes")
export class ChangesController {
  @Get()
  @Roles("Admin", "Agent")
  @ApiOperation({ summary: "List changes (stub)" })
  list() {
    return { data: [], message: "stub — business logic in later phase" };
  }

  @Get(":id")
  @Roles("Admin", "Agent")
  @ApiOperation({ summary: "Get change by id (stub)" })
  get(@Param("id") id: string) {
    return { id, message: "stub" };
  }
}
