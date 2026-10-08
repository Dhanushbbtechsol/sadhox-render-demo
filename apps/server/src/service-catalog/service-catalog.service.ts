import {
  BadRequestException,
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
  subcategory: serviceCatalog.subcategory,
  formFields: serviceCatalog.formFields,
  isActive: serviceCatalog.isActive,
} as const;

/** Free-text concrete service label under department — not validated against the incident map. */
function sanitizeOptionalSubcategory(
  value: string | null | undefined,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = sanitizePlainText(value, 128);
  return trimmed.length > 0 ? trimmed : null;
}

function sanitizeFormFields(
  fields: CreateCatalogItemDto["formFields"],
): CatalogFormField[] {
  return fields.map((field) => {
    const name = sanitizePlainText(field.name, 64);
    const label = sanitizePlainText(field.label, 128);
    if (!name || !label) {
      throw new BadRequestException(
        "Form field name and label are required after sanitization",
      );
    }
    const options = field.options
      ?.map((option) => sanitizePlainText(option, 128))
      .filter((option) => option.length > 0);
    return {
      name,
      label,
      type: field.type,
      ...(field.required !== undefined ? { required: field.required } : {}),
      ...(options !== undefined ? { options } : {}),
    };
  });
}

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
    const name = sanitizePlainText(dto.name, 255);
    const description = sanitizePlainText(dto.description, 4000);
    const department = sanitizePlainText(dto.department, 128);
    if (!name || !description || !department) {
      throw new BadRequestException(
        "Catalog name, description, and department are required",
      );
    }
    const subcategory = sanitizeOptionalSubcategory(dto.subcategory) ?? null;

    const [row] = await this.db
      .insert(serviceCatalog)
      .values({
        name,
        description,
        department,
        subcategory,
        formFields: sanitizeFormFields(dto.formFields),
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

    const patch: {
      name?: string;
      description?: string;
      department?: string;
      subcategory?: string | null;
      formFields?: CatalogFormField[];
      isActive?: boolean;
      updatedAt: Date;
    } = { updatedAt: new Date() };

    if (dto.name !== undefined) {
      const name = sanitizePlainText(dto.name, 255);
      if (!name) {
        throw new BadRequestException("Catalog name is required");
      }
      patch.name = name;
    }
    if (dto.description !== undefined) {
      const description = sanitizePlainText(dto.description, 4000);
      if (!description) {
        throw new BadRequestException("Catalog description is required");
      }
      patch.description = description;
    }
    if (dto.department !== undefined) {
      const department = sanitizePlainText(dto.department, 128);
      if (!department) {
        throw new BadRequestException("Catalog department is required");
      }
      patch.department = department;
    }
    if (dto.subcategory !== undefined) {
      patch.subcategory = sanitizeOptionalSubcategory(dto.subcategory) ?? null;
    }
    if (dto.formFields !== undefined) {
      patch.formFields = sanitizeFormFields(dto.formFields);
    }
    if (dto.isActive !== undefined) {
      patch.isActive = dto.isActive;
    }

    const [row] = await this.db
      .update(serviceCatalog)
      .set(patch)
      .where(eq(serviceCatalog.id, id))
      .returning(publicSelect);

    return row;
  }

  async ensureSeeded() {
    for (const item of CATALOG_SEED) {
      const [existing] = await this.db
        .select({
          id: serviceCatalog.id,
          department: serviceCatalog.department,
          subcategory: serviceCatalog.subcategory,
        })
        .from(serviceCatalog)
        .where(eq(serviceCatalog.id, item.id))
        .limit(1);
      if (!existing) {
        await this.db.insert(serviceCatalog).values({
          id: item.id,
          name: item.name,
          description: item.description,
          department: item.department,
          subcategory: item.subcategory,
          formFields: item.formFields,
        });
        continue;
      }
      if (
        existing.department !== item.department ||
        existing.subcategory !== item.subcategory
      ) {
        await this.db
          .update(serviceCatalog)
          .set({
            department: item.department,
            subcategory: item.subcategory,
            updatedAt: new Date(),
          })
          .where(eq(serviceCatalog.id, item.id));
      }
    }
  }
}
