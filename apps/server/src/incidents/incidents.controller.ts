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
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  CurrentUser,
  type AuthUser,
} from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import {
  CreateCommentDto,
  CreateIncidentDto,
  UpdateIncidentDto,
} from "./dto/incident.dto";
import { ListIncidentsQueryDto } from "./dto/list-incidents-query.dto";
import { IncidentsService } from "./incidents.service";

@ApiTags("incidents")
@ApiBearerAuth()
@Controller("incidents")
export class IncidentsController {
  constructor(private readonly incidents: IncidentsService) {}

  @Get()
  @Roles("Admin", "Agent", "EndUser")
  @ApiOperation({
    summary:
      "Paginated incident list with filters (EndUser scoped to own tickets)",
  })
  list(@CurrentUser() user: AuthUser, @Query() query: ListIncidentsQueryDto) {
    return this.incidents.list(user, query);
  }

  @Post()
  @HttpCode(201)
  @Roles("Admin", "Agent", "EndUser")
  @ApiOperation({
    summary: "Create incident (priority + SLA computed server-side)",
  })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateIncidentDto) {
    return this.incidents.create(user, dto);
  }

  @Get(":id")
  @Roles("Admin", "Agent", "EndUser")
  @ApiOperation({
    summary: "Incident detail with reporter, assignee, and SLA target",
  })
  get(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.incidents.get(user, id);
  }

  @Patch(":id")
  @Roles("Admin", "Agent")
  @ApiOperation({ summary: "Update incident fields (Admin/Agent)" })
  update(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateIncidentDto,
  ) {
    return this.incidents.update(user, id, dto);
  }

  @Get(":id/comments")
  @Roles("Admin", "Agent", "EndUser")
  @ApiOperation({ summary: "List comments for an incident" })
  listComments(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.incidents.listComments(user, id);
  }

  @Post(":id/comments")
  @HttpCode(201)
  @Roles("Admin", "Agent", "EndUser")
  @ApiOperation({ summary: "Add a comment and emit comment.created" })
  addComment(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.incidents.addComment(user, id, dto);
  }
}
