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
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  CurrentUser,
  type AuthUser,
} from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ASSET_ADMIN_ROLES } from "./assets.roles";
import { AssetsService } from "./assets.service";
import { CreateAssetDto } from "./dto/create-asset.dto";
import { LinkTicketDto } from "./dto/link-ticket.dto";
import { ListAssetsQueryDto } from "./dto/list-assets-query.dto";
import { UpdateAssetDto } from "./dto/update-asset.dto";

@ApiTags("assets")
@ApiBearerAuth()
@Controller("assets")
@Roles(...ASSET_ADMIN_ROLES)
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Get()
  @ApiOperation({ summary: "List assets with search and filters" })
  list(@Query() query: ListAssetsQueryDto) {
    return this.assets.list(query);
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: "Create asset" })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAssetDto) {
    return this.assets.create(dto, user.userId);
  }

  @Get(":id/assignments")
  @ApiOperation({
    summary: "Assignment history for an asset (Admin, newest first)",
  })
  listAssignments(@Param("id", ParseUUIDPipe) id: string) {
    return this.assets.listAssignments(id);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get asset by id" })
  get(@Param("id", ParseUUIDPipe) id: string) {
    return this.assets.getById(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update asset metadata or owner" })
  update(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssetDto,
  ) {
    return this.assets.update(id, dto, user.userId);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Soft-delete asset (status = Retired)" })
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.assets.softDelete(id);
  }

  @Post(":id/link-ticket")
  @ApiOperation({ summary: "Link asset to an active incident or service request" })
  linkTicket(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: LinkTicketDto,
  ) {
    return this.assets.linkTicket(id, dto);
  }

  @Delete(":id/unlink-ticket")
  @ApiOperation({ summary: "Unlink ticket from asset" })
  unlinkTicket(@Param("id", ParseUUIDPipe) id: string) {
    return this.assets.unlinkTicket(id);
  }
}
