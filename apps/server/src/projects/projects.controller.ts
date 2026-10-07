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
  UpdateModuleDto,
  UpdateProjectDto,
} from "./dto/projects.dto";
import { ProjectsService } from "./projects.service";

@ApiTags("projects")
@ApiBearerAuth()
@Controller("projects")
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  @Roles("Admin", "Manager")
  @ApiOperation({ summary: "List accessible projects" })
  list(@CurrentUser() user: AuthUser) {
    return this.projects.list(user);
  }

  @Post()
  @HttpCode(201)
  @Roles("Admin")
  @ApiOperation({ summary: "Create project (Admin)" })
  create(@Body() dto: CreateProjectDto) {
    return this.projects.create(dto);
  }

  @Get(":id")
  @Roles("Admin", "Manager")
  @ApiOperation({ summary: "Get project by id" })
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
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projects.update(id, dto);
  }

  @Delete(":id")
  @Roles("Admin")
  @ApiOperation({ summary: "Delete project (Admin)" })
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.projects.remove(id);
  }

  @Get(":id/members")
  @Roles("Admin", "Manager")
  @ApiOperation({ summary: "List project members (Agents)" })
  listMembers(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.projects.listMembers(user, id);
  }

  @Post(":id/members")
  @HttpCode(201)
  @Roles("Admin")
  @ApiOperation({ summary: "Add Agent member (Admin)" })
  addMember(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AddProjectMemberDto,
  ) {
    return this.projects.addMember(id, dto);
  }

  @Delete(":id/members/:userId")
  @Roles("Admin")
  @ApiOperation({ summary: "Remove project member (Admin)" })
  removeMember(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("userId", ParseUUIDPipe) userId: string,
  ) {
    return this.projects.removeMember(id, userId);
  }

  @Get(":id/modules")
  @Roles("Admin", "Manager")
  @ApiOperation({ summary: "List project modules" })
  listModules(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.projects.listModules(user, id);
  }

  @Post(":id/modules")
  @HttpCode(201)
  @Roles("Admin")
  @ApiOperation({ summary: "Create module (Admin)" })
  createModule(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateModuleDto,
  ) {
    return this.projects.createModule(id, dto);
  }

  @Patch(":id/modules/:moduleId")
  @Roles("Admin")
  @ApiOperation({ summary: "Update module (Admin)" })
  updateModule(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("moduleId", ParseUUIDPipe) moduleId: string,
    @Body() dto: UpdateModuleDto,
  ) {
    return this.projects.updateModule(id, moduleId, dto);
  }

  @Delete(":id/modules/:moduleId")
  @Roles("Admin")
  @ApiOperation({ summary: "Delete module (Admin)" })
  removeModule(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("moduleId", ParseUUIDPipe) moduleId: string,
  ) {
    return this.projects.removeModule(id, moduleId);
  }
}
