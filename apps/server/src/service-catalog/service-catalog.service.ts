import { Inject, Injectable } from "@nestjs/common";
import { asc, eq } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import type { DrizzleDB } from "../database/database.module";
import { serviceCatalog } from "../database/schema";
import { CATALOG_SEED } from "./catalog.seed";

@Injectable()
export class ServiceCatalogService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async list() {
    const rows = await this.db
      .select({
        id: serviceCatalog.id,
        name: serviceCatalog.name,
        description: serviceCatalog.description,
        department: serviceCatalog.department,
        formFields: serviceCatalog.formFields,
      })
      .from(serviceCatalog)
      .where(eq(serviceCatalog.isActive, true))
      .orderBy(asc(serviceCatalog.department), asc(serviceCatalog.name));

    return { data: rows };
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
