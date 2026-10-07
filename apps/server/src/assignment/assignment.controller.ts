import { Controller, Get, Query } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { Roles } from "../common/decorators/roles.decorator";
import { AssignmentService } from "./assignment.service";

@ApiTags("assignment")
@ApiBearerAuth()
@Controller("assignment")
export class AssignmentController {
  constructor(private readonly assignment: AssignmentService) {}

  @Get("agents")
  @Roles("Admin", "Agent")
  @ApiOperation({
    summary:
      "List agents eligible for ticket assignment (optional projectId scopes to project_members)",
  })
  @ApiQuery({
    name: "projectId",
    required: false,
    description: "When set, pool = project_members Agents only",
  })
  listAgents(@Query("projectId") projectId?: string) {
    return this.assignment.listAgents(projectId || null);
  }
}
