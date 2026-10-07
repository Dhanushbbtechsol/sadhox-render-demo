import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
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
} from "./dto/project.dto";
import { ProjectsService } from "./projects.service";

@ApiTags("projects")
@ApiBearerAuth()
@Controller("projects")
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  @Roles("Admin", "Agent", "EndUser", "Manager")
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
  create(@Body() dto: CreateProjectDto) {
    return this.projects.create(dto);
  }

  @Get(":id/modules")
  @Roles("Admin", "Agent", "EndUser", "Manager")
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
  @ApiOperation({ summary: "Create a module on a project (Admin)" })
  createModule(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateModuleDto,
  ) {
    return this.projects.createModule(id, dto);
  }

  @Get(":id/members")
  @Roles("Admin", "Agent", "Manager")
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
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AddProjectMemberDto,
  ) {
    return this.projects.addMember(id, dto);
  }
}
