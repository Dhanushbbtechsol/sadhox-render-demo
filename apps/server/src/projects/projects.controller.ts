import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  CurrentUser,
  type AuthUser,
} from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import {
  AddProjectMemberDto,
  CreateModuleDto,
  CreateProjectDto,
  UpdateProjectDto,
} from "./dto/project.dto";
import { ProjectsService } from "./projects.service";

@ApiTags("projects")
@ApiBearerAuth()
@Controller("projects")
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  @Roles("Admin", "Manager", "Agent", "EndUser")
  @ApiOperation({
    summary:
      "List projects (Admin/EndUser: all; Manager: owned; Agent: member)",
  })
  list(@CurrentUser() user: AuthUser) {
    return this.projects.list(user);
  }

  @Post()
  @HttpCode(201)
  @Roles("Admin")
  @ApiOperation({ summary: "Create a project (Admin)" })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateProjectDto) {
    return this.projects.create(user, dto);
  }

  @Get(":id")
  @Roles("Admin", "Manager", "Agent")
  @ApiOperation({ summary: "Get project if accessible" })
  get(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.projects.get(user, id);
  }

  @Patch(":id")
  @Roles("Admin")
  @ApiOperation({ summary: "Update project (Admin)" })
  update(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projects.update(user, id, dto);
  }

  @Get(":id/modules")
  @Roles("Admin", "Manager", "Agent", "EndUser")
  @ApiOperation({ summary: "List modules for a project" })
  listModules(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.projects.listModules(user, id);
  }

  @Post(":id/modules")
  @HttpCode(201)
  @Roles("Admin")
  @ApiOperation({ summary: "Create module under a project (Admin)" })
  createModule(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateModuleDto,
  ) {
    return this.projects.createModule(user, id, dto);
  }

  @Get(":id/members")
  @Roles("Admin", "Manager", "Agent")
  @ApiOperation({ summary: "List Agent members of a project" })
  listMembers(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.projects.listMembers(user, id);
  }

  @Post(":id/members")
  @HttpCode(201)
  @Roles("Admin")
  @ApiOperation({ summary: "Add an Agent as project member (Admin)" })
  addMember(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AddProjectMemberDto,
  ) {
    return this.projects.addMember(user, id, dto);
  }

  @Delete(":id/members/:userId")
  @Roles("Admin")
  @ApiOperation({ summary: "Remove a project member (Admin)" })
  removeMember(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("userId", ParseUUIDPipe) userId: string,
  ) {
    return this.projects.removeMember(user, id, userId);
  }
}
