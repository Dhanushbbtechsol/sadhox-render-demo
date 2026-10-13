import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import { sanitizePlainText } from "../common/sanitize-plain-text";
import { DRIZZLE } from "../database/database.constants";
import type { DrizzleDB } from "../database/database.module";
import {
  incidents,
  knowledgeArticles,
  knowledgeCategories,
  problems,
  serviceRequests,
  ticketKnowledgeLinks,
  users,
} from "../database/schema";
import type {
  CreateArticleDto,
  CreateCategoryDto,
  KnowledgeLinkTicketType,
  ListArticlesQueryDto,
  UpdateArticleDto,
  UpdateCategoryDto,
} from "./dto/knowledge.dto";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class KnowledgeService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async listCategories() {
    const rows = await this.db
      .select()
      .from(knowledgeCategories)
      .orderBy(knowledgeCategories.name);
    return { data: rows };
  }

  async createCategory(dto: CreateCategoryDto) {
    const name = sanitizePlainText(dto.name, 255);
    const slug = sanitizePlainText(dto.slug, 255).toLowerCase();
    const description =
      dto.description != null
        ? sanitizePlainText(dto.description, 2000) || null
        : null;
    if (!name || !slug) {
      throw new BadRequestException("Name and slug are required");
    }

    try {
      const [row] = await this.db
        .insert(knowledgeCategories)
        .values({ name, slug, description })
        .returning();
      return row;
    } catch {
      throw new ConflictException("Category slug already exists");
    }
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    await this.requireCategory(id);
    const patch: Partial<typeof knowledgeCategories.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (dto.name !== undefined) {
      const name = sanitizePlainText(dto.name, 255);
      if (!name) throw new BadRequestException("Name cannot be empty");
      patch.name = name;
    }
    if (dto.slug !== undefined) {
      const slug = sanitizePlainText(dto.slug, 255).toLowerCase();
      if (!slug) throw new BadRequestException("Slug cannot be empty");
      patch.slug = slug;
    }
    if (dto.description !== undefined) {
      patch.description =
        dto.description == null
          ? null
          : sanitizePlainText(dto.description, 2000) || null;
    }

    try {
      const [row] = await this.db
        .update(knowledgeCategories)
        .set(patch)
        .where(eq(knowledgeCategories.id, id))
        .returning();
      return row;
    } catch {
      throw new ConflictException("Category slug already exists");
    }
  }

  async deleteCategory(id: string) {
    await this.requireCategory(id);
    const [linked] = await this.db
      .select({ id: knowledgeArticles.id })
      .from(knowledgeArticles)
      .where(eq(knowledgeArticles.categoryId, id))
      .limit(1);
    if (linked) {
      throw new ConflictException("Category still has articles");
    }
    await this.db
      .delete(knowledgeCategories)
      .where(eq(knowledgeCategories.id, id));
    return { ok: true };
  }

  async listArticles(user: AuthUser, query: ListArticlesQueryDto) {
    const filters = [];
    if (user.role !== "Admin") {
      filters.push(eq(knowledgeArticles.status, "Published"));
    }
    if (query.categoryId) {
      filters.push(eq(knowledgeArticles.categoryId, query.categoryId));
    }
    if (query.q?.trim()) {
      const term = `%${query.q.trim()}%`;
      filters.push(
        or(
          ilike(knowledgeArticles.title, term),
          ilike(knowledgeArticles.body, term),
        )!,
      );
    }

    const where = filters.length ? and(...filters) : undefined;
    const rows = await this.db
      .select({
        id: knowledgeArticles.id,
        title: knowledgeArticles.title,
        slug: knowledgeArticles.slug,
        body: knowledgeArticles.body,
        status: knowledgeArticles.status,
        categoryId: knowledgeArticles.categoryId,
        categoryName: knowledgeCategories.name,
        categorySlug: knowledgeCategories.slug,
        authorId: knowledgeArticles.authorId,
        authorName: users.name,
        createdAt: knowledgeArticles.createdAt,
        updatedAt: knowledgeArticles.updatedAt,
      })
      .from(knowledgeArticles)
      .innerJoin(
        knowledgeCategories,
        eq(knowledgeArticles.categoryId, knowledgeCategories.id),
      )
      .innerJoin(users, eq(knowledgeArticles.authorId, users.id))
      .where(where)
      .orderBy(desc(knowledgeArticles.updatedAt))
      .limit(100);

    return { data: rows };
  }

  async getArticle(user: AuthUser, idOrSlug: string) {
    const byId = UUID_RE.test(idOrSlug);
    const [row] = await this.db
      .select({
        id: knowledgeArticles.id,
        title: knowledgeArticles.title,
        slug: knowledgeArticles.slug,
        body: knowledgeArticles.body,
        status: knowledgeArticles.status,
        categoryId: knowledgeArticles.categoryId,
        categoryName: knowledgeCategories.name,
        categorySlug: knowledgeCategories.slug,
        authorId: knowledgeArticles.authorId,
        authorName: users.name,
        createdAt: knowledgeArticles.createdAt,
        updatedAt: knowledgeArticles.updatedAt,
      })
      .from(knowledgeArticles)
      .innerJoin(
        knowledgeCategories,
        eq(knowledgeArticles.categoryId, knowledgeCategories.id),
      )
      .innerJoin(users, eq(knowledgeArticles.authorId, users.id))
      .where(
        byId
          ? eq(knowledgeArticles.id, idOrSlug)
          : eq(knowledgeArticles.slug, idOrSlug),
      )
      .limit(1);

    if (!row) throw new NotFoundException("Article not found");
    if (row.status !== "Published" && user.role !== "Admin") {
      throw new NotFoundException("Article not found");
    }
    return row;
  }

  async createArticle(user: AuthUser, dto: CreateArticleDto) {
    await this.requireCategory(dto.categoryId);
    const title = sanitizePlainText(dto.title, 255);
    const slug = sanitizePlainText(dto.slug, 255).toLowerCase();
    const body = sanitizePlainText(dto.body, 50000);
    if (!title || !slug || !body) {
      throw new BadRequestException("Title, slug, and body are required");
    }

    try {
      const [row] = await this.db
        .insert(knowledgeArticles)
        .values({
          title,
          slug,
          body,
          status: dto.status,
          categoryId: dto.categoryId,
          authorId: user.userId,
        })
        .returning();
      return this.getArticle(user, row!.id);
    } catch {
      throw new ConflictException("Article slug already exists");
    }
  }

  async updateArticle(user: AuthUser, id: string, dto: UpdateArticleDto) {
    await this.requireArticleRow(id);
    if (dto.categoryId) await this.requireCategory(dto.categoryId);

    const patch: Partial<typeof knowledgeArticles.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (dto.title !== undefined) {
      const title = sanitizePlainText(dto.title, 255);
      if (!title) throw new BadRequestException("Title cannot be empty");
      patch.title = title;
    }
    if (dto.slug !== undefined) {
      const slug = sanitizePlainText(dto.slug, 255).toLowerCase();
      if (!slug) throw new BadRequestException("Slug cannot be empty");
      patch.slug = slug;
    }
    if (dto.body !== undefined) {
      const body = sanitizePlainText(dto.body, 50000);
      if (!body) throw new BadRequestException("Body cannot be empty");
      patch.body = body;
    }
    if (dto.status !== undefined) patch.status = dto.status;
    if (dto.categoryId !== undefined) patch.categoryId = dto.categoryId;

    try {
      await this.db
        .update(knowledgeArticles)
        .set(patch)
        .where(eq(knowledgeArticles.id, id));
      return this.getArticle(user, id);
    } catch {
      throw new ConflictException("Article slug already exists");
    }
  }

  async deleteArticle(id: string) {
    await this.requireArticleRow(id);
    await this.db
      .delete(knowledgeArticles)
      .where(eq(knowledgeArticles.id, id));
    return { ok: true };
  }

  async listLinks(
    user: AuthUser,
    ticketType: KnowledgeLinkTicketType,
    ticketId: string,
  ) {
    await this.assertCanAccessTicket(user, ticketType, ticketId);

    const rows = await this.db
      .select({
        id: ticketKnowledgeLinks.id,
        ticketId: ticketKnowledgeLinks.ticketId,
        ticketType: ticketKnowledgeLinks.ticketType,
        articleId: ticketKnowledgeLinks.articleId,
        createdAt: ticketKnowledgeLinks.createdAt,
        title: knowledgeArticles.title,
        slug: knowledgeArticles.slug,
        status: knowledgeArticles.status,
      })
      .from(ticketKnowledgeLinks)
      .innerJoin(
        knowledgeArticles,
        eq(ticketKnowledgeLinks.articleId, knowledgeArticles.id),
      )
      .where(
        and(
          eq(ticketKnowledgeLinks.ticketType, ticketType),
          eq(ticketKnowledgeLinks.ticketId, ticketId),
        ),
      )
      .orderBy(desc(ticketKnowledgeLinks.createdAt));

    const data = rows
      .filter((row) => row.status === "Published" || user.role === "Admin")
      .map((row) => ({
        id: row.id,
        ticketId: row.ticketId,
        ticketType: row.ticketType,
        articleId: row.articleId,
        createdAt: row.createdAt,
        article: {
          id: row.articleId,
          title: row.title,
          slug: row.slug,
          status: row.status,
        },
      }));

    return { data };
  }

  async linkArticle(
    user: AuthUser,
    ticketType: KnowledgeLinkTicketType,
    ticketId: string,
    articleId: string,
  ) {
    if (user.role !== "Admin" && user.role !== "Agent") {
      throw new ForbiddenException("Only Admin or Agent can link articles");
    }
    await this.assertCanAccessTicket(user, ticketType, ticketId);

    const [article] = await this.db
      .select()
      .from(knowledgeArticles)
      .where(eq(knowledgeArticles.id, articleId))
      .limit(1);
    if (!article || article.status !== "Published") {
      throw new BadRequestException("Only Published articles can be linked");
    }

    try {
      const [link] = await this.db
        .insert(ticketKnowledgeLinks)
        .values({ ticketId, ticketType, articleId })
        .returning();
      return {
        id: link!.id,
        ticketId: link!.ticketId,
        ticketType: link!.ticketType,
        articleId: link!.articleId,
        createdAt: link!.createdAt,
        article: {
          id: article.id,
          title: article.title,
          slug: article.slug,
          status: article.status,
        },
      };
    } catch {
      throw new ConflictException("Article already linked to this ticket");
    }
  }

  async unlinkArticle(
    user: AuthUser,
    ticketType: KnowledgeLinkTicketType,
    ticketId: string,
    articleId: string,
  ) {
    if (user.role !== "Admin" && user.role !== "Agent") {
      throw new ForbiddenException("Only Admin or Agent can unlink articles");
    }
    await this.assertCanAccessTicket(user, ticketType, ticketId);

    const deleted = await this.db
      .delete(ticketKnowledgeLinks)
      .where(
        and(
          eq(ticketKnowledgeLinks.ticketType, ticketType),
          eq(ticketKnowledgeLinks.ticketId, ticketId),
          eq(ticketKnowledgeLinks.articleId, articleId),
        ),
      )
      .returning({ id: ticketKnowledgeLinks.id });

    if (deleted.length === 0) {
      throw new NotFoundException("Link not found");
    }
    return { ok: true };
  }

  private async requireCategory(id: string) {
    const [row] = await this.db
      .select({ id: knowledgeCategories.id })
      .from(knowledgeCategories)
      .where(eq(knowledgeCategories.id, id))
      .limit(1);
    if (!row) throw new NotFoundException("Category not found");
    return row;
  }

  private async requireArticleRow(id: string) {
    const [row] = await this.db
      .select({ id: knowledgeArticles.id })
      .from(knowledgeArticles)
      .where(eq(knowledgeArticles.id, id))
      .limit(1);
    if (!row) throw new NotFoundException("Article not found");
    return row;
  }

  private async assertCanAccessTicket(
    user: AuthUser,
    ticketType: KnowledgeLinkTicketType,
    ticketId: string,
  ) {
    if (ticketType === "incident") {
      const [row] = await this.db
        .select({
          id: incidents.id,
          reporterId: incidents.reporterId,
        })
        .from(incidents)
        .where(eq(incidents.id, ticketId))
        .limit(1);
      if (!row) throw new NotFoundException("Incident not found");
      if (
        user.role === "EndUser" &&
        row.reporterId !== user.userId
      ) {
        throw new ForbiddenException("Not allowed to access this incident");
      }
      return;
    }

    if (ticketType === "problem") {
      if (user.role === "EndUser") {
        throw new ForbiddenException("EndUser cannot access problems");
      }
      const [row] = await this.db
        .select({ id: problems.id })
        .from(problems)
        .where(eq(problems.id, ticketId))
        .limit(1);
      if (!row) throw new NotFoundException("Problem not found");
      return;
    }

    const [row] = await this.db
      .select({
        id: serviceRequests.id,
        requesterId: serviceRequests.requesterId,
        requesterReportsToId: users.reportsToId,
      })
      .from(serviceRequests)
      .leftJoin(users, eq(serviceRequests.requesterId, users.id))
      .where(eq(serviceRequests.id, ticketId))
      .limit(1);
    if (!row) throw new NotFoundException("Service request not found");
    if (user.role === "EndUser" && row.requesterId !== user.userId) {
      throw new ForbiddenException("Not allowed to access this request");
    }
    if (user.role === "Manager" && row.requesterReportsToId !== user.userId) {
      throw new ForbiddenException("Not allowed to access this request");
    }
  }
}
