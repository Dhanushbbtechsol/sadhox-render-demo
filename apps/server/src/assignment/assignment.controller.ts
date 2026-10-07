import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Roles } from "../common/decorators/roles.decorator";
import { AssignmentService } from "./assignment.service";
import { ListAgentsQueryDto } from "./dto/list-agents-query.dto";

@ApiTags("assignment")
@ApiBearerAuth()
@Controller("assignment")
export class AssignmentController {
  constructor(private readonly assignment: AssignmentService) {}

  @Get("agents")
  @Roles("Admin", "Agent", "Manager")
  @ApiOperation({
    summary:
      "List agents eligible for ticket assignment (project members when projectId set)",
  })
  listAgents(@Query() query: ListAgentsQueryDto) {
    return this.assignment.listAgents(query.projectId);
  }
}
