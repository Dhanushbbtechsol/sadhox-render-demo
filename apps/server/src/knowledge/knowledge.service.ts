import {
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, asc, eq, ilike, or, type SQL } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import type { DrizzleDB } from "../database/database.module";
import {
  knowledgeArticles,
  knowledgeCategories,
} from "../database/schema";
import { KNOWLEDGE_SEED } from "./knowledge.seed";
import type { ListArticlesQueryDto } from "./dto/list-articles-query.dto";

@Injectable()
export class KnowledgeService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async listCategories() {
    const rows = await this.db
      .select({
        id: knowledgeCategories.id,
        name: knowledgeCategories.name,
        slug: knowledgeCategories.slug,
        description: knowledgeCategories.description,
      })
      .from(knowledgeCategories)
      .orderBy(asc(knowledgeCategories.name));

    return { data: rows };
  }

  async listArticles(
    query: ListArticlesQueryDto,
    options: { includeDrafts: boolean },
  ) {
    const conditions: SQL[] = [];

    if (!options.includeDrafts) {
      conditions.push(eq(knowledgeArticles.status, "Published"));
    }

    if (query.categoryId) {
      conditions.push(eq(knowledgeArticles.categoryId, query.categoryId));
    }

    const needle = query.q?.trim();
    if (needle) {
      const pattern = `%${needle}%`;
      conditions.push(
        or(
          ilike(knowledgeArticles.title, pattern),
          ilike(knowledgeArticles.body, pattern),
        )!,
      );
    }

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
        createdAt: knowledgeArticles.createdAt,
        updatedAt: knowledgeArticles.updatedAt,
      })
      .from(knowledgeArticles)
      .innerJoin(
        knowledgeCategories,
        eq(knowledgeArticles.categoryId, knowledgeCategories.id),
      )
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(knowledgeArticles.title));

    return { data: rows };
  }

  async getBySlug(slug: string, options: { includeDrafts: boolean }) {
    const conditions: SQL[] = [eq(knowledgeArticles.slug, slug)];
    if (!options.includeDrafts) {
      conditions.push(eq(knowledgeArticles.status, "Published"));
    }

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
        createdAt: knowledgeArticles.createdAt,
        updatedAt: knowledgeArticles.updatedAt,
      })
      .from(knowledgeArticles)
      .innerJoin(
        knowledgeCategories,
        eq(knowledgeArticles.categoryId, knowledgeCategories.id),
      )
      .where(and(...conditions))
      .limit(1);

    if (!row) {
      throw new NotFoundException("Article not found");
    }

    return row;
  }

  async ensureSeeded() {
    for (const category of KNOWLEDGE_SEED.categories) {
      const [existing] = await this.db
        .select({ id: knowledgeCategories.id })
        .from(knowledgeCategories)
        .where(eq(knowledgeCategories.id, category.id))
        .limit(1);
      if (existing) continue;
      await this.db.insert(knowledgeCategories).values(category);
    }

    for (const article of KNOWLEDGE_SEED.articles) {
      const [existing] = await this.db
        .select({ id: knowledgeArticles.id })
        .from(knowledgeArticles)
        .where(eq(knowledgeArticles.id, article.id))
        .limit(1);
      if (existing) continue;
      await this.db.insert(knowledgeArticles).values(article);
    }
  }
}
