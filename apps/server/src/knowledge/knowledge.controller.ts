import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  CurrentUser,
  type AuthUser,
} from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { ListArticlesQueryDto } from "./dto/list-articles-query.dto";
import { KnowledgeService } from "./knowledge.service";

@ApiTags("knowledge")
@ApiBearerAuth()
@Controller("knowledge")
export class KnowledgeController {
  constructor(private readonly knowledge: KnowledgeService) {}

  @Get("categories")
  @Roles("Admin", "Agent", "EndUser")
  @ApiOperation({ summary: "List knowledge categories" })
  listCategories() {
    return this.knowledge.listCategories();
  }

  @Get("articles")
  @Roles("Admin", "Agent", "EndUser")
  @ApiOperation({
    summary: "Search and filter knowledge articles",
    description:
      "EndUser and Agent see Published only. Admin also sees Draft articles.",
  })
  listArticles(
    @CurrentUser() user: AuthUser,
    @Query() query: ListArticlesQueryDto,
  ) {
    return this.knowledge.listArticles(query, {
      includeDrafts: user.role === "Admin",
    });
  }

  @Get("articles/:slug")
  @Roles("Admin", "Agent", "EndUser")
  @ApiOperation({ summary: "Get a knowledge article by slug" })
  getBySlug(@CurrentUser() user: AuthUser, @Param("slug") slug: string) {
    return this.knowledge.getBySlug(slug, {
      includeDrafts: user.role === "Admin",
    });
  }
}
