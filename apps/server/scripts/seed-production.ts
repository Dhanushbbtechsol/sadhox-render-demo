/**
 * Production-safe seed (prep only — do not run without explicit go-ahead).
 *
 * Seeds:
 * - One Admin user (random password printed once to stdout; never written to disk)
 * - Baseline sla_rules (exact P1–P4 values from scripts/seed.ts)
 * - Service catalog rows from CATALOG_SEED (Dev B catalog.seed.ts) — not invented
 *
 * Does NOT seed: Agent/EndUser accounts, showcase tickets, demo SRs/changes.
 *
 * Usage (when approved):
 *   DATABASE_URL=… pnpm exec tsx scripts/seed-production.ts
 */
import "dotenv/config";
import * as bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import {
  assertPasswordComplexity,
  generateSeedPassword,
} from "../src/common/password-policy";
import { users, slaRules, serviceCatalog } from "../src/database/schema";
import { CATALOG_SEED } from "../src/service-catalog/catalog.seed";
import { responseMinutesForSeed } from "../src/incidents/priority";

const ADMIN_EMAIL = "admin@sadhox.local";

/** Exact P1–P4 baselines — keep in sync with scripts/seed.ts */
const SLA_DEFAULTS = [
  { priority: "P1" as const, responseMinutes: 15, resolveMinutes: 240 },
  { priority: "P2" as const, responseMinutes: 60, resolveMinutes: 480 },
  { priority: "P3" as const, responseMinutes: 240, resolveMinutes: 1440 },
  { priority: "P4" as const, responseMinutes: 480, resolveMinutes: 4320 },
] as const;

async function seedProduction() {
  if (process.env.ALLOW_PRODUCTION_SEED !== "1") {
    throw new Error(
      "Refusing to run: set ALLOW_PRODUCTION_SEED=1 after explicit approval",
    );
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }

  const client = postgres(url, { max: 1 });
  const db = drizzle(client);

  const seedPassword = generateSeedPassword();
  assertPasswordComplexity(seedPassword);
  const passwordHash = await bcrypt.hash(seedPassword, 12);

  const [existingAdmin] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, ADMIN_EMAIL))
    .limit(1);

  if (existingAdmin) {
    console.log(`skip existing admin ${ADMIN_EMAIL} (password not printed)`);
  } else {
    await db.insert(users).values({
      email: ADMIN_EMAIL,
      passwordHash,
      role: "Admin",
      name: "Sadhox Admin",
    });
    // Print once to stdout only — never write to .seed-password or logs elsewhere.
    process.stdout.write(
      `\n=== ONE-TIME ADMIN PASSWORD (copy to password manager; not saved) ===\n`,
    );
    process.stdout.write(`${seedPassword}\n`);
    process.stdout.write(
      `======================================================================\n\n`,
    );
  }

  for (const rule of SLA_DEFAULTS) {
    const [existing] = await db
      .select({ responseMinutes: slaRules.responseMinutes })
      .from(slaRules)
      .where(eq(slaRules.priority, rule.priority))
      .limit(1);
    const responseMinutes = responseMinutesForSeed(
      existing?.responseMinutes ?? null,
      rule.responseMinutes,
    );
    if (responseMinutes === null) continue;
    await db.insert(slaRules).values({
      priority: rule.priority,
      responseMinutes,
      resolveMinutes: rule.resolveMinutes,
    });
  }
  console.log("SLA rules ensured (P1–P4 baselines)");

  for (const item of CATALOG_SEED) {
    const [existing] = await db
      .select()
      .from(serviceCatalog)
      .where(eq(serviceCatalog.id, item.id))
      .limit(1);
    if (!existing) {
      await db.insert(serviceCatalog).values({
        id: item.id,
        name: item.name,
        description: item.description,
        department: item.department,
        subcategory: item.subcategory,
        formFields: item.formFields,
      });
      console.log(`created catalog ${item.name}`);
      continue;
    }
    if (
      existing.department !== item.department ||
      existing.subcategory !== item.subcategory
    ) {
      await db
        .update(serviceCatalog)
        .set({
          department: item.department,
          subcategory: item.subcategory,
          updatedAt: new Date(),
        })
        .where(eq(serviceCatalog.id, item.id));
      console.log(
        `retagged catalog ${item.name} → ${item.department} / ${item.subcategory}`,
      );
    } else {
      console.log(`skip catalog ${item.name} (already correct)`);
    }
  }

  await client.end();
  console.log("Production seed complete (no showcase data)");
}

seedProduction().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
