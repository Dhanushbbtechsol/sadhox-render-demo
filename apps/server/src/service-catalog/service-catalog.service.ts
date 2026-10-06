import {
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { asc, eq } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import type { DrizzleDB } from "../database/database.module";
import type { CatalogFormField } from "../database/schema";
import { serviceCatalog } from "../database/schema";
import { CATALOG_SEED } from "./catalog.seed";
import type {
  CreateCatalogItemDto,
  UpdateCatalogItemDto,
} from "./dto/catalog-item.dto";

const publicSelect = {
  id: serviceCatalog.id,
  name: serviceCatalog.name,
  description: serviceCatalog.description,
  department: serviceCatalog.department,
  formFields: serviceCatalog.formFields,
  isActive: serviceCatalog.isActive,
} as const;

@Injectable()
export class ServiceCatalogService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async list(options?: { includeInactive?: boolean }) {
    const rows = await this.db
      .select(publicSelect)
      .from(serviceCatalog)
      .where(
        options?.includeInactive
          ? undefined
          : eq(serviceCatalog.isActive, true),
      )
      .orderBy(asc(serviceCatalog.department), asc(serviceCatalog.name));

    return { data: rows };
  }

  async create(dto: CreateCatalogItemDto) {
    const [row] = await this.db
      .insert(serviceCatalog)
      .values({
        name: dto.name.trim(),
        description: dto.description.trim(),
        department: dto.department.trim(),
        formFields: dto.formFields as CatalogFormField[],
        isActive: dto.isActive ?? true,
      })
      .returning(publicSelect);

    return row;
  }

  async update(id: string, dto: UpdateCatalogItemDto) {
    const [existing] = await this.db
      .select({ id: serviceCatalog.id })
      .from(serviceCatalog)
      .where(eq(serviceCatalog.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundException("Catalog item not found");
    }

    const [row] = await this.db
      .update(serviceCatalog)
      .set({
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description.trim() }
          : {}),
        ...(dto.department !== undefined
          ? { department: dto.department.trim() }
          : {}),
        ...(dto.formFields !== undefined
          ? { formFields: dto.formFields as CatalogFormField[] }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        updatedAt: new Date(),
      })
      .where(eq(serviceCatalog.id, id))
      .returning(publicSelect);

    return row;
  }

  async ensureSeeded() {
    for (const item of CATALOG_SEED) {
      const [existing] = await this.db
        .select({ id: serviceCatalog.id })
        .from(serviceCatalog)
        .where(eq(serviceCatalog.id, item.id))
        .limit(1);
      if (existing) continue;
      await this.db.insert(serviceCatalog).values({
        id: item.id,
        name: item.name,
        description: item.description,
        department: item.department,
        formFields: item.formFields,
      });
    }
  }
}
