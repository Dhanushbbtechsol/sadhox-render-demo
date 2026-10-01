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
import { Roles } from "../common/decorators/roles.decorator";
import {
  CreateProblemDto,
  ListProblemsQueryDto,
  UpdateProblemDto,
} from "./dto/problem.dto";
import { ProblemsService } from "./problems.service";

@ApiTags("problems")
@ApiBearerAuth()
@Controller("problems")
export class ProblemsController {
  constructor(private readonly problems: ProblemsService) {}

  @Get()
  @Roles("Admin", "Agent")
  @ApiOperation({ summary: "Paginated problem list" })
  list(@Query() query: ListProblemsQueryDto) {
    return this.problems.list(query);
  }

  @Post()
  @HttpCode(201)
  @Roles("Admin", "Agent")
  @ApiOperation({ summary: "Create problem and optionally link incidents" })
  create(@Body() dto: CreateProblemDto) {
    return this.problems.create(dto);
  }

  @Get(":id")
  @Roles("Admin", "Agent")
  @ApiOperation({ summary: "Get problem with linked incidents" })
  get(@Param("id", ParseUUIDPipe) id: string) {
    return this.problems.get(id);
  }

  @Post(":id/incidents/:incidentId")
  @HttpCode(200)
  @Roles("Admin", "Agent")
  @ApiOperation({
    summary:
      "Add one incident link without replacing existing links (lost-update safe)",
  })
  linkIncident(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("incidentId", ParseUUIDPipe) incidentId: string,
  ) {
    return this.problems.linkIncident(id, incidentId);
  }

  @Patch(":id")
  @Roles("Admin", "Agent")
  @ApiOperation({ summary: "Update problem fields and linked incidents" })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateProblemDto,
  ) {
    return this.problems.update(id, dto);
  }
}
