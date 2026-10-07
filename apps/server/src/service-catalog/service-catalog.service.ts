import {
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { asc, eq } from "drizzle-orm";
import { sanitizePlainText } from "../common/sanitize-plain-text";
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
        name: sanitizePlainText(dto.name, 255),
        description: sanitizePlainText(dto.description, 4000),
        department: sanitizePlainText(dto.department, 128),
        formFields: this.sanitizeFormFields(dto.formFields),
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
        ...(dto.name !== undefined
          ? { name: sanitizePlainText(dto.name, 255) }
          : {}),
        ...(dto.description !== undefined
          ? { description: sanitizePlainText(dto.description, 4000) }
          : {}),
        ...(dto.department !== undefined
          ? { department: sanitizePlainText(dto.department, 128) }
          : {}),
        ...(dto.formFields !== undefined
          ? { formFields: this.sanitizeFormFields(dto.formFields) }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        updatedAt: new Date(),
      })
      .where(eq(serviceCatalog.id, id))
      .returning(publicSelect);

    return row;
  }

  private sanitizeFormFields(
    fields: CreateCatalogItemDto["formFields"],
  ): CatalogFormField[] {
    return fields.map((field) => ({
      name: sanitizePlainText(field.name, 64),
      label: sanitizePlainText(field.label, 128),
      type: field.type,
      ...(field.required !== undefined ? { required: field.required } : {}),
      ...(field.options !== undefined
        ? {
            options: field.options.map((opt) =>
              sanitizePlainText(opt, 128),
            ),
          }
        : {}),
    }));
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
