import { Controller, Get, Query } from "@nestjs/common";
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
      "List agents eligible for ticket assignment (optional projectId scopes to project_members)",
  })
  @ApiQuery({
    name: "projectId",
    required: false,
    description:
      "When set, pool = project_members Agents only; requires project access",
  })
  listAgents(
    @CurrentUser() user: AuthUser,
    @Query() query: ListAgentsQueryDto,
  ) {
    return this.assignment.listAgents(user, query.projectId);
  }
}
