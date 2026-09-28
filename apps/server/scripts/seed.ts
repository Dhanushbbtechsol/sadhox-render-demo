import "dotenv/config";
import * as bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { users, slaRules, serviceCatalog } from "../src/database/schema";
import { CATALOG_SEED } from "../src/service-catalog/catalog.seed";

async function seed() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }

  const client = postgres(url, { max: 1 });
  const db = drizzle(client);

  const passwordHash = await bcrypt.hash("ChangeMe123!", 12);

  const seedUsers = [
    {
      email: "admin@sadhox.local",
      passwordHash,
      role: "Admin" as const,
      name: "Ian Admin",
    },
    {
      email: "agent@sadhox.local",
      passwordHash,
      role: "Agent" as const,
      name: "Alice Agent",
    },
    {
      email: "enduser@sadhox.local",
      passwordHash,
      role: "EndUser" as const,
      name: "End User",
    },
  ];

  for (const u of seedUsers) {
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, u.email))
      .limit(1);
    if (existing) {
      console.log(`skip existing user ${u.email}`);
      continue;
    }
    await db.insert(users).values(u);
    console.log(`created ${u.role} ${u.email}`);
  }

  const defaults = [
    { priority: "P1" as const, responseMinutes: 15, resolveMinutes: 240 },
    { priority: "P2" as const, responseMinutes: 60, resolveMinutes: 480 },
    { priority: "P3" as const, responseMinutes: 240, resolveMinutes: 1440 },
    { priority: "P4" as const, responseMinutes: 480, resolveMinutes: 2880 },
  ];
  for (const rule of defaults) {
    await db.insert(slaRules).values(rule).onConflictDoNothing();
  }
  console.log("SLA rules ensured");

  for (const item of CATALOG_SEED) {
    const [existing] = await db
      .select()
      .from(serviceCatalog)
      .where(eq(serviceCatalog.id, item.id))
      .limit(1);
    if (existing) {
      console.log(`skip existing catalog ${item.name}`);
      continue;
    }
    await db.insert(serviceCatalog).values({
      id: item.id,
      name: item.name,
      description: item.description,
      department: item.department,
      formFields: item.formFields,
    });
    console.log(`created catalog ${item.name}`);
  }

  await client.end();
  console.log("Seed complete");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
