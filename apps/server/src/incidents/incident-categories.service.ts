import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { and, asc, eq } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import type { DrizzleDB } from "../database/database.module";
import {
  incidentCategories,
  incidentSubcategories,
  type Priority,
} from "../database/schema";
import {
  INCIDENT_CATEGORY_SUBCATEGORY_MAP,
  SEED_SUBCATEGORY_MIN_PRIORITY,
} from "./incident-category-map";

export type TaxonomySubcategory = {
  id: string;
  name: string;
  minPriority: Priority | null;
  isActive: boolean;
};

export type TaxonomyCategory = {
  id: string;
  name: string;
  isActive: boolean;
  subcategories: TaxonomySubcategory[];
};

@Injectable()
export class IncidentCategoriesService implements OnModuleInit {
  private readonly logger = new Logger(IncidentCategoriesService.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async onModuleInit() {
    try {
      await this.ensureSeeded();
    } catch (err) {
      this.logger.warn(
        `Category taxonomy seed skipped: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  /** Active taxonomy for ticket forms (all authenticated roles). */
  async listTaxonomy(opts?: { includeInactive?: boolean }): Promise<{
    data: TaxonomyCategory[];
  }> {
    const includeInactive = opts?.includeInactive === true;
    const cats = await this.db
      .select()
      .from(incidentCategories)
      .where(
        includeInactive ? undefined : eq(incidentCategories.isActive, true),
      )
      .orderBy(asc(incidentCategories.name));
    const subs = await this.db
      .select()
      .from(incidentSubcategories)
      .where(
        includeInactive ? undefined : eq(incidentSubcategories.isActive, true),
      )
      .orderBy(asc(incidentSubcategories.name));

    const byCat = new Map<string, TaxonomySubcategory[]>();
    for (const sub of subs) {
      const list = byCat.get(sub.categoryId) ?? [];
      list.push({
        id: sub.id,
        name: sub.name,
        minPriority: sub.minPriority,
        isActive: sub.isActive,
      });
      byCat.set(sub.categoryId, list);
    }

    return {
      data: cats.map((cat) => ({
        id: cat.id,
        name: cat.name,
        isActive: cat.isActive,
        subcategories: byCat.get(cat.id) ?? [],
      })),
    };
  }

  async findActivePair(
    category: string,
    subcategory: string,
  ): Promise<{ minPriority: Priority | null } | null> {
    const [row] = await this.db
      .select({
        minPriority: incidentSubcategories.minPriority,
        catActive: incidentCategories.isActive,
        subActive: incidentSubcategories.isActive,
      })
      .from(incidentSubcategories)
      .innerJoin(
        incidentCategories,
        eq(incidentSubcategories.categoryId, incidentCategories.id),
      )
      .where(
        and(
          eq(incidentCategories.name, category),
          eq(incidentSubcategories.name, subcategory),
        ),
      )
      .limit(1);

    if (!row || !row.catActive || !row.subActive) return null;
    return { minPriority: row.minPriority };
  }

  async assertActivePair(category: string, subcategory: string): Promise<{
    minPriority: Priority | null;
  }> {
    const pair = await this.findActivePair(category, subcategory);
    if (!pair) {
      throw new BadRequestException(
        `Invalid ticket category/subcategory pair "${category}" / "${subcategory}". Choose an active pair from Admin → Categories.`,
      );
    }
    return pair;
  }

  async createCategory(name: string) {
    const trimmed = name.trim();
    if (!trimmed) throw new BadRequestException("Category name is required");
    try {
      const [created] = await this.db
        .insert(incidentCategories)
        .values({ name: trimmed })
        .returning();
      return created!;
    } catch {
      throw new BadRequestException(`Category "${trimmed}" already exists`);
    }
  }

  async updateCategory(
    id: string,
    patch: { name?: string; isActive?: boolean },
  ) {
    const [existing] = await this.db
      .select()
      .from(incidentCategories)
      .where(eq(incidentCategories.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException("Category not found");

    const name =
      patch.name !== undefined ? patch.name.trim() : existing.name;
    if (!name) throw new BadRequestException("Category name is required");

    try {
      const [updated] = await this.db
        .update(incidentCategories)
        .set({
          name,
          ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
          updatedAt: new Date(),
        })
        .where(eq(incidentCategories.id, id))
        .returning();
      return updated!;
    } catch {
      throw new BadRequestException(`Category "${name}" already exists`);
    }
  }

  async createSubcategory(input: {
    categoryId: string;
    name: string;
    minPriority?: Priority | null;
  }) {
    const [cat] = await this.db
      .select()
      .from(incidentCategories)
      .where(eq(incidentCategories.id, input.categoryId))
      .limit(1);
    if (!cat) throw new NotFoundException("Category not found");

    const name = input.name.trim();
    if (!name) throw new BadRequestException("Subcategory name is required");

    try {
      const [created] = await this.db
        .insert(incidentSubcategories)
        .values({
          categoryId: input.categoryId,
          name,
          minPriority: input.minPriority ?? null,
        })
        .returning();
      return created!;
    } catch {
      throw new BadRequestException(
        `Subcategory "${name}" already exists under "${cat.name}"`,
      );
    }
  }

  async updateSubcategory(
    id: string,
    patch: {
      name?: string;
      minPriority?: Priority | null;
      isActive?: boolean;
    },
  ) {
    const [existing] = await this.db
      .select()
      .from(incidentSubcategories)
      .where(eq(incidentSubcategories.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException("Subcategory not found");

    const name =
      patch.name !== undefined ? patch.name.trim() : existing.name;
    if (!name) throw new BadRequestException("Subcategory name is required");

    try {
      const [updated] = await this.db
        .update(incidentSubcategories)
        .set({
          name,
          ...(patch.minPriority !== undefined
            ? { minPriority: patch.minPriority }
            : {}),
          ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
          updatedAt: new Date(),
        })
        .where(eq(incidentSubcategories.id, id))
        .returning();
      return updated!;
    } catch {
      throw new BadRequestException(
        `Subcategory "${name}" already exists in this category`,
      );
    }
  }

  /** Idempotent seed from the Phase 7 map + demo min-priority floors. */
  async ensureSeeded() {
    for (const [category, subs] of Object.entries(
      INCIDENT_CATEGORY_SUBCATEGORY_MAP,
    )) {
      let [cat] = await this.db
        .select()
        .from(incidentCategories)
        .where(eq(incidentCategories.name, category))
        .limit(1);
      if (!cat) {
        [cat] = await this.db
          .insert(incidentCategories)
          .values({ name: category })
          .returning();
      }
      for (const subName of subs) {
        const [existing] = await this.db
          .select()
          .from(incidentSubcategories)
          .where(
            and(
              eq(incidentSubcategories.categoryId, cat!.id),
              eq(incidentSubcategories.name, subName),
            ),
          )
          .limit(1);
        if (existing) continue;
        const minPriority =
          SEED_SUBCATEGORY_MIN_PRIORITY[`${category}::${subName}`] ?? null;
        await this.db.insert(incidentSubcategories).values({
          categoryId: cat!.id,
          name: subName,
          minPriority,
        });
      }
    }
  }
}
