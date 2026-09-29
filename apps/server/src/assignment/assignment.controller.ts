import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Roles } from "../common/decorators/roles.decorator";
import { AssignmentService } from "./assignment.service";

@ApiTags("assignment")
@ApiBearerAuth()
@Controller("assignment")
export class AssignmentController {
  constructor(private readonly assignment: AssignmentService) {}

  @Get("agents")
  @Roles("Admin", "Agent")
  @ApiOperation({ summary: "List agents eligible for ticket assignment" })
  listAgents() {
    return this.assignment.listAgents();
  }
}
