import "dotenv/config";
import * as bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, like, sql } from "drizzle-orm";
import postgres from "postgres";
import {
  assertPasswordComplexity,
  generateSeedPassword,
} from "../src/common/password-policy";
import {
  users,
  slaRules,
  serviceCatalog,
  incidents,
  serviceRequests,
  changes,
} from "../src/database/schema";
import { CATALOG_SEED } from "../src/service-catalog/catalog.seed";

const SHOWCASE_PREFIX = "[Showcase]";

async function seed() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }

  const client = postgres(url, { max: 1 });
  const db = drizzle(client);

  const seedPassword = process.env.SEED_PASSWORD ?? generateSeedPassword();
  assertPasswordComplexity(seedPassword);
  const passwordHash = await bcrypt.hash(seedPassword, 12);

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
    {
      email: "user@sadhox.local",
      passwordHash,
      role: "EndUser" as const,
      name: "End User",
    },
  ];

  let createdAny = false;
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
    createdAny = true;
    console.log(`created ${u.role} ${u.email}`);
  }

  if (createdAny) {
    console.log("");
    console.log("=== ONE-TIME SEED PASSWORD (store securely; not logged elsewhere) ===");
    console.log(seedPassword);
    console.log("======================================================================");
    console.log("Override with SEED_PASSWORD=... on future seeds if needed.");
  } else {
    console.log("No new users created — password not printed.");
  }

  const defaults = [
    { priority: "P1" as const, responseMinutes: 15, resolveMinutes: 240 },
    { priority: "P2" as const, responseMinutes: 60, resolveMinutes: 480 },
    { priority: "P3" as const, responseMinutes: 240, resolveMinutes: 1440 },
    { priority: "P4" as const, responseMinutes: 480, resolveMinutes: 4320 },
  ];
  for (const rule of defaults) {
    await db
      .insert(slaRules)
      .values(rule)
      .onConflictDoUpdate({
        target: slaRules.priority,
        set: {
          responseMinutes: rule.responseMinutes,
          resolveMinutes: rule.resolveMinutes,
        },
      });
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

  await seedShowcaseData(db);

  await client.end();
  console.log("Seed complete");
}

type SeedDb = ReturnType<typeof drizzle>;

async function seedShowcaseData(db: SeedDb) {
  const [existingShowcase] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(incidents)
    .where(like(incidents.title, `${SHOWCASE_PREFIX}%`));

  if (Number(existingShowcase?.n ?? 0) > 0) {
    console.log("skip showcase ticket data (already present)");
    return;
  }

  const [admin] = await db
    .select()
    .from(users)
    .where(eq(users.email, "admin@sadhox.local"))
    .limit(1);
  const [agent] = await db
    .select()
    .from(users)
    .where(eq(users.email, "agent@sadhox.local"))
    .limit(1);
  const [endUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, "enduser@sadhox.local"))
    .limit(1);

  if (!admin || !agent || !endUser) {
    console.log("skip showcase data — seed users missing");
    return;
  }

  const catalogId = CATALOG_SEED[0]?.id;
  if (!catalogId) {
    console.log("skip showcase data — catalog seed empty");
    return;
  }

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const week = 7 * day;

  /** Eight weeks of resolved incidents for SLA area chart (met + breached). */
  const resolvedShowcase: {
    title: string;
    priority: "P1" | "P2" | "P3" | "P4";
    impact: "High" | "Medium" | "Low";
    urgency: "High" | "Medium" | "Low";
    category: string;
    weekOffset: number;
    met: boolean;
  }[] = [];

  const priorities = ["P1", "P2", "P3", "P4"] as const;
  for (let w = 7; w >= 0; w--) {
    const metCount = 6 + ((7 - w) % 3);
    const breachedCount = 1 + (w % 3);
    for (let i = 0; i < metCount; i++) {
      resolvedShowcase.push({
        title: `${SHOWCASE_PREFIX} Week-${8 - w} met #${i + 1}`,
        priority: priorities[i % priorities.length],
        impact: i % 2 === 0 ? "Medium" : "Low",
        urgency: i % 3 === 0 ? "High" : "Medium",
        category: ["Network", "Hardware", "Access", "Other"][i % 4],
        weekOffset: w,
        met: true,
      });
    }
    for (let i = 0; i < breachedCount; i++) {
      resolvedShowcase.push({
        title: `${SHOWCASE_PREFIX} Week-${8 - w} breached #${i + 1}`,
        priority: priorities[(i + 1) % priorities.length],
        impact: "High",
        urgency: "High",
        category: ["Network", "Software"][i % 2],
        weekOffset: w,
        met: false,
      });
    }
  }

  const openStatuses = ["New", "Assigned", "InProgress"] as const;
  const openShowcase = openStatuses.flatMap((status, si) =>
    Array.from({ length: 3 + si }, (_, i) => ({
      title: `${SHOWCASE_PREFIX} Open ${status} #${i + 1}`,
      priority: priorities[(si + i) % priorities.length],
      impact: "Medium" as const,
      urgency: "Medium" as const,
      category: "Other",
      status,
    })),
  );

  for (const row of resolvedShowcase) {
    const weekStart = now - row.weekOffset * week - 2 * day;
    const createdAt = new Date(weekStart);
    const resolveMinutes =
      row.priority === "P1" ? 240 : row.priority === "P2" ? 480 : row.priority === "P3" ? 1440 : 4320;
    const slaDueAt = new Date(weekStart + resolveMinutes * 60 * 1000);
    const resolvedAt = row.met
      ? new Date(slaDueAt.getTime() - 45 * 60 * 1000)
      : new Date(slaDueAt.getTime() + 3 * 60 * 60 * 1000);

    await db.insert(incidents).values({
      title: row.title,
      description: "Dashboard showcase seed — safe to delete.",
      category: row.category,
      priority: row.priority,
      impact: row.impact,
      urgency: row.urgency,
      status: "Resolved",
      assignedTo: agent.id,
      reporterId: endUser.id,
      slaDueAt,
      resolvedAt,
      createdAt,
      updatedAt: resolvedAt,
    });
  }

  for (const row of openShowcase) {
    await db.insert(incidents).values({
      title: row.title,
      description: "Dashboard showcase seed — open ticket.",
      category: row.category,
      priority: row.priority,
      impact: row.impact,
      urgency: row.urgency,
      status: row.status,
      assignedTo: row.status === "New" ? null : agent.id,
      reporterId: endUser.id,
      slaDueAt: new Date(now + 2 * day),
    });
  }

  const srStatuses = [
    "Submitted",
    "PendingApproval",
    "Approved",
    "InFulfillment",
    "Fulfilled",
    "Closed",
  ] as const;
  for (const [i, status] of srStatuses.entries()) {
    for (let n = 0; n < 2 + (i % 2); n++) {
      await db.insert(serviceRequests).values({
        catalogId,
        requesterId: endUser.id,
        approverId: status === "Submitted" || status === "PendingApproval" ? null : admin.id,
        title: `${SHOWCASE_PREFIX} SR ${status} #${n + 1}`,
        description: "Showcase service request",
        justification: "Demo dashboard volume",
        urgency: n % 2 === 0 ? "Medium" : "High",
        fields: { laptopType: "Standard" },
        status,
        approvedAt:
          status === "Approved" || status === "InFulfillment" || status === "Fulfilled" || status === "Closed"
            ? new Date(now - i * day)
            : null,
      });
    }
  }

  const changeRows: {
    title: string;
    type: "Standard" | "Normal" | "Emergency";
    status: "Submitted" | "Approved" | "Scheduled" | "Implemented" | "Closed";
  }[] = [
    { title: `${SHOWCASE_PREFIX} Firewall rule update`, type: "Normal", status: "Submitted" },
    { title: `${SHOWCASE_PREFIX} VPN gateway patch`, type: "Normal", status: "Approved" },
    { title: `${SHOWCASE_PREFIX} Softphone cutover`, type: "Standard", status: "Scheduled" },
    { title: `${SHOWCASE_PREFIX} DB index rebuild`, type: "Normal", status: "Implemented" },
    { title: `${SHOWCASE_PREFIX} Wi-Fi controller upgrade`, type: "Emergency", status: "Closed" },
    { title: `${SHOWCASE_PREFIX} Printer fleet firmware`, type: "Standard", status: "Closed" },
  ];

  for (const row of changeRows) {
    await db.insert(changes).values({
      title: row.title,
      description: "Showcase change for admin dashboard",
      type: row.type,
      status: row.status,
      createdBy: agent.id,
      approvedBy: row.status === "Submitted" ? null : admin.id,
      approvedAt: row.status === "Submitted" ? null : new Date(now - 3 * day),
      scheduledStart: new Date(now + day),
      scheduledEnd: new Date(now + 2 * day),
      rollbackPlan: "Revert config from last known good.",
    });
  }

  console.log(
    `showcase seeded: ${resolvedShowcase.length} resolved + ${openShowcase.length} open incidents, SRs, changes`,
  );
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
