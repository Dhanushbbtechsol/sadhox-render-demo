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
import {
  CreateArticleDto,
  CreateCategoryDto,
  LinkArticleDto,
  ListArticlesQueryDto,
  UpdateArticleDto,
  UpdateCategoryDto,
} from "./dto/knowledge.dto";
import { KnowledgeService } from "./knowledge.service";
import { parseLinkTicketType } from "./knowledge.ticket-type";

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

  @Post("categories")
  @HttpCode(201)
  @Roles("Admin")
  @ApiOperation({ summary: "Create knowledge category (Admin)" })
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.knowledge.createCategory(dto);
  }

  @Patch("categories/:id")
  @Roles("Admin")
  @ApiOperation({ summary: "Update knowledge category (Admin)" })
  updateCategory(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.knowledge.updateCategory(id, dto);
  }

  @Delete("categories/:id")
  @Roles("Admin")
  @ApiOperation({ summary: "Delete empty knowledge category (Admin)" })
  deleteCategory(@Param("id", ParseUUIDPipe) id: string) {
    return this.knowledge.deleteCategory(id);
  }

  @Get("articles")
  @Roles("Admin", "Agent", "EndUser")
  @ApiOperation({
    summary:
      "Search/list articles (Published for Agent/EndUser; Admin sees Draft too)",
  })
  listArticles(
    @CurrentUser() user: AuthUser,
    @Query() query: ListArticlesQueryDto,
  ) {
    return this.knowledge.listArticles(user, query);
  }

  @Post("articles")
  @HttpCode(201)
  @Roles("Admin")
  @ApiOperation({ summary: "Create knowledge article (Admin)" })
  createArticle(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateArticleDto,
  ) {
    return this.knowledge.createArticle(user, dto);
  }

  @Get("articles/:idOrSlug")
  @Roles("Admin", "Agent", "EndUser")
  @ApiOperation({ summary: "Get article by id or slug" })
  getArticle(
    @CurrentUser() user: AuthUser,
    @Param("idOrSlug") idOrSlug: string,
  ) {
    return this.knowledge.getArticle(user, idOrSlug);
  }

  @Patch("articles/:id")
  @Roles("Admin")
  @ApiOperation({ summary: "Update knowledge article (Admin)" })
  updateArticle(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateArticleDto,
  ) {
    return this.knowledge.updateArticle(user, id, dto);
  }

  @Delete("articles/:id")
  @Roles("Admin")
  @ApiOperation({ summary: "Delete knowledge article (Admin)" })
  deleteArticle(@Param("id", ParseUUIDPipe) id: string) {
    return this.knowledge.deleteArticle(id);
  }

  @Get("tickets/:ticketType/:ticketId/links")
  @Roles("Admin", "Agent", "EndUser")
  @ApiOperation({ summary: "List KB articles linked to a ticket" })
  listLinks(
    @CurrentUser() user: AuthUser,
    @Param("ticketType") ticketType: string,
    @Param("ticketId", ParseUUIDPipe) ticketId: string,
  ) {
    return this.knowledge.listLinks(
      user,
      parseLinkTicketType(ticketType),
      ticketId,
    );
  }

  @Post("tickets/:ticketType/:ticketId/links")
  @HttpCode(201)
  @Roles("Admin", "Agent")
  @ApiOperation({ summary: "Link a Published article to a ticket" })
  linkArticle(
    @CurrentUser() user: AuthUser,
    @Param("ticketType") ticketType: string,
    @Param("ticketId", ParseUUIDPipe) ticketId: string,
    @Body() dto: LinkArticleDto,
  ) {
    return this.knowledge.linkArticle(
      user,
      parseLinkTicketType(ticketType),
      ticketId,
      dto.articleId,
    );
  }

  @Delete("tickets/:ticketType/:ticketId/links/:articleId")
  @Roles("Admin", "Agent")
  @ApiOperation({ summary: "Unlink an article from a ticket" })
  unlinkArticle(
    @CurrentUser() user: AuthUser,
    @Param("ticketType") ticketType: string,
    @Param("ticketId", ParseUUIDPipe) ticketId: string,
    @Param("articleId", ParseUUIDPipe) articleId: string,
  ) {
    return this.knowledge.unlinkArticle(
      user,
      parseLinkTicketType(ticketType),
      ticketId,
      articleId,
    );
  }
}
