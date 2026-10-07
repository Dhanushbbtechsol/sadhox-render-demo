import "dotenv/config";
import * as bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq, like, sql } from "drizzle-orm";
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
  assets,
  knowledgeCategories,
  knowledgeArticles,
  projects,
  projectMembers,
  modules,
} from "../src/database/schema";
import {
  KNOWLEDGE_ARTICLE_SEED,
  KNOWLEDGE_CATEGORY_SEED,
} from "../src/knowledge/knowledge.seed";
import { CATALOG_SEED } from "../src/service-catalog/catalog.seed";

const SHOWCASE_PREFIX = "[Showcase]";
const PHASE6_PROJECT_ID = "a1000000-0000-4000-8000-000000000001";
const PHASE6_MODULE_ID = "a1000000-0000-4000-8000-000000000002";

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
    {
      email: "manager@sadhox.local",
      passwordHash,
      role: "Manager" as const,
      name: "Morgan Manager",
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
    const { writeFileSync } = await import("node:fs");
    writeFileSync(".seed-password", seedPassword, { mode: 0o600 });
    console.log("");
    console.log("=== ONE-TIME SEED PASSWORD (store securely; not logged elsewhere) ===");
    console.log(seedPassword);
    console.log("======================================================================");
    console.log("Also wrote apps/server/.seed-password (gitignored).");
    console.log("Override with SEED_PASSWORD=... on future seeds if needed.");
  } else {
    console.log("No new users created — password not printed.");
    console.log("Reset with: SEED_PASSWORD=ChangeMe123! node scripts/reset-seed-password.mjs");
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

  await seedPhase6Projects(db);
  await seedShowcaseData(db);
  await attachShowcaseIncidentsToProject(db);
  await seedPhase4Assets(db);
  await seedKnowledgeBase(db);
  await seedPhase6Projects(db);

  await client.end();
  console.log("Seed complete");
}

async function seedPhase6Projects(db: SeedDb) {
  const [manager] = await db
    .select()
    .from(users)
    .where(eq(users.email, "manager@sadhox.local"))
    .limit(1);
  const [agent] = await db
    .select()
    .from(users)
    .where(eq(users.email, "agent@sadhox.local"))
    .limit(1);

  if (!manager || !agent) {
    console.log("skip Phase 6 project seed — manager/agent missing");
    return;
  }

  const [existing] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, PHASE6_PROJECT_ID))
    .limit(1);

  if (!existing) {
    await db.insert(projects).values({
      id: PHASE6_PROJECT_ID,
      name: "Core Platform",
      managerId: manager.id,
    });
    console.log("created project Core Platform");
  } else {
    console.log("skip existing project Core Platform");
  }

  const [member] = await db
    .select()
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, PHASE6_PROJECT_ID),
        eq(projectMembers.userId, agent.id),
      ),
    )
    .limit(1);
  if (!member) {
    await db.insert(projectMembers).values({
      projectId: PHASE6_PROJECT_ID,
      userId: agent.id,
    });
    console.log("added Alice Agent to Core Platform");
  }

  const [mod] = await db
    .select()
    .from(modules)
    .where(eq(modules.id, PHASE6_MODULE_ID))
    .limit(1);
  if (!mod) {
    await db.insert(modules).values({
      id: PHASE6_MODULE_ID,
      projectId: PHASE6_PROJECT_ID,
      name: "API",
    });
    console.log("created module API under Core Platform");
  }
}

/** Scope open showcase incidents so Agent/Manager queues are non-empty. */
async function attachShowcaseIncidentsToProject(db: SeedDb) {
  const [proj] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, PHASE6_PROJECT_ID))
    .limit(1);
  if (!proj) return;

  await db
    .update(incidents)
    .set({
      projectId: PHASE6_PROJECT_ID,
      moduleId: PHASE6_MODULE_ID,
    })
    .where(
      and(
        like(incidents.title, `${SHOWCASE_PREFIX}%`),
        sql`${incidents.projectId} is null`,
        sql`${incidents.status} in ('New','Assigned','InProgress')`,
      ),
    );
  console.log("attached open showcase incidents to Core Platform");
}

async function seedKnowledgeBase(db: SeedDb) {
  const [admin] = await db
    .select()
    .from(users)
    .where(eq(users.email, "admin@sadhox.local"))
    .limit(1);
  if (!admin) {
    console.log("skip knowledge seed — admin user missing");
    return;
  }

  for (const category of KNOWLEDGE_CATEGORY_SEED) {
    const [existing] = await db
      .select()
      .from(knowledgeCategories)
      .where(eq(knowledgeCategories.id, category.id))
      .limit(1);
    if (existing) {
      console.log(`skip existing knowledge category ${category.slug}`);
      continue;
    }
    await db.insert(knowledgeCategories).values({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
    });
    console.log(`created knowledge category ${category.slug}`);
  }

  for (const article of KNOWLEDGE_ARTICLE_SEED) {
    const [existing] = await db
      .select()
      .from(knowledgeArticles)
      .where(eq(knowledgeArticles.id, article.id))
      .limit(1);
    if (existing) {
      console.log(`skip existing knowledge article ${article.slug}`);
      continue;
    }
    await db.insert(knowledgeArticles).values({
      id: article.id,
      title: article.title,
      slug: article.slug,
      body: article.body,
      status: article.status,
      categoryId: article.categoryId,
      authorId: admin.id,
    });
    console.log(`created knowledge article ${article.slug}`);
  }
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

  /** Phase 4 Day 19: one ticket per status × priority for staging walkthroughs. */
  const lifecycleMatrix: {
    title: string;
    priority: (typeof priorities)[number];
    status: "New" | "Assigned" | "InProgress" | "Resolved" | "Closed";
    impact: "High" | "Medium" | "Low";
    urgency: "High" | "Medium" | "Low";
  }[] = [];
  const allStatuses = ["New", "Assigned", "InProgress", "Resolved", "Closed"] as const;
  for (const status of allStatuses) {
    for (const priority of priorities) {
      lifecycleMatrix.push({
        title: `${SHOWCASE_PREFIX} Lifecycle ${status} ${priority}`,
        priority,
        status,
        impact: priority === "P1" || priority === "P2" ? "High" : "Medium",
        urgency: priority === "P1" ? "High" : priority === "P2" ? "Medium" : "Low",
      });
    }
  }

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

  for (const row of lifecycleMatrix) {
    const resolvedAt =
      row.status === "Resolved" || row.status === "Closed"
        ? new Date(now - day)
        : null;
    const closedAt = row.status === "Closed" ? new Date(now - day / 2) : null;
    await db.insert(incidents).values({
      title: row.title,
      description:
        "Phase 4 staging seed — P1–P4 across New/Assigned/InProgress/Resolved/Closed.",
      category: "Other",
      priority: row.priority,
      impact: row.impact,
      urgency: row.urgency,
      status: row.status,
      assignedTo: row.status === "New" ? null : agent.id,
      reporterId: endUser.id,
      slaDueAt: new Date(now + 2 * day),
      resolutionNotes:
        row.status === "Resolved" || row.status === "Closed"
          ? "Seed resolution notes for lifecycle matrix."
          : null,
      resolvedAt,
      closedAt,
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
    `showcase seeded: ${resolvedShowcase.length} resolved + ${openShowcase.length} open + ${lifecycleMatrix.length} lifecycle incidents, SRs, changes`,
  );

  const [catalogCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(serviceCatalog);
  const [changeCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(changes);
  const [srCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(serviceRequests);
  console.log(
    `Phase 4 seed validation — catalog=${catalogCount?.count ?? 0} changes=${changeCount?.count ?? 0} service_requests=${srCount?.count ?? 0}`,
  );
  if ((catalogCount?.count ?? 0) < 1) {
    throw new Error("Seed validation failed: expected at least 1 catalog item");
  }
  if ((changeCount?.count ?? 0) < 1) {
    throw new Error("Seed validation failed: expected historical changes");
  }
}

const ASSET_SEED_PREFIX = "P4-";

async function seedPhase4Assets(db: SeedDb) {
  const [existing] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(assets)
    .where(like(assets.assetTag, `${ASSET_SEED_PREFIX}%`));

  if (Number(existing?.n ?? 0) >= 100) {
    console.log(`skip phase4 assets (already have ${existing?.n})`);
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

  const openIncidents = await db
    .select({ id: incidents.id })
    .from(incidents)
    .where(like(incidents.title, `${SHOWCASE_PREFIX}%`))
    .limit(20);

  const statuses = ["Active", "InRepair", "Retired"] as const;
  const types = ["Hardware", "Software"] as const;
  const names = [
    "Latitude laptop",
    "Docking station",
    "M365 license",
    "Monitor 27in",
    "Headset",
    "VPN token",
    "Phone handset",
    "Asset tag printer",
  ];

  const rows = [];
  for (let i = 1; i <= 120; i++) {
    const type = types[i % types.length];
    const status = statuses[i % statuses.length];
    const tag = `${ASSET_SEED_PREFIX}${type === "Hardware" ? "HW" : "SW"}-${String(i).padStart(4, "0")}`;
    const linked =
      openIncidents.length > 0 && i % 7 === 0
        ? openIncidents[i % openIncidents.length]!.id
        : null;
    const ownerId = i % 5 === 0 ? admin?.id ?? null : i % 3 === 0 ? agent?.id ?? null : null;
    const cost = (150 + (i % 40) * 37.5).toFixed(2);
    rows.push({
      assetTag: tag,
      name: `${SHOWCASE_PREFIX} ${names[i % names.length]} #${i}`,
      type,
      status,
      ownerId,
      purchaseCost: cost,
      linkedTicketId: linked,
    });
  }

  // Insert in chunks
  for (let i = 0; i < rows.length; i += 40) {
    await db.insert(assets).values(rows.slice(i, i + 40)).onConflictDoNothing();
  }

  console.log(`phase4 assets seeded: ${rows.length} (prefix ${ASSET_SEED_PREFIX})`);
}

async function seedPhase6Projects(db: SeedDb) {
  const [manager] = await db
    .select()
    .from(users)
    .where(eq(users.email, "manager@sadhox.local"))
    .limit(1);
  const [agent] = await db
    .select()
    .from(users)
    .where(eq(users.email, "agent@sadhox.local"))
    .limit(1);
  const [admin] = await db
    .select()
    .from(users)
    .where(eq(users.email, "admin@sadhox.local"))
    .limit(1);

  if (!manager) {
    console.log("skip phase6 projects (manager user missing)");
    return;
  }

  const PROJECT_ID = "a1000000-0000-4000-8000-000000000001";
  const MODULE_ID = "a1000000-0000-4000-8000-000000000002";
  // Second project owned by Admin — Manager/Agent must not see its tickets in scoped lists.
  const OTHER_PROJECT_ID = "a1000000-0000-4000-8000-000000000003";

  const [existing] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, PROJECT_ID))
    .limit(1);

  if (!existing) {
    await db.insert(projects).values({
      id: PROJECT_ID,
      name: "Platform Ops",
      managerId: manager.id,
    });
    console.log("created project Platform Ops");
  } else {
    console.log("skip existing project Platform Ops");
  }

  const [mod] = await db
    .select({ id: modules.id })
    .from(modules)
    .where(eq(modules.id, MODULE_ID))
    .limit(1);
  if (!mod) {
    await db.insert(modules).values({
      id: MODULE_ID,
      projectId: PROJECT_ID,
      name: "Core Services",
    });
    console.log("created module Core Services");
  }

  if (agent) {
    await db
      .insert(projectMembers)
      .values({ projectId: PROJECT_ID, userId: agent.id })
      .onConflictDoNothing();
    console.log("ensured agent membership on Platform Ops");
  }

  if (admin) {
    const [other] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.id, OTHER_PROJECT_ID))
      .limit(1);
    if (!other) {
      await db.insert(projects).values({
        id: OTHER_PROJECT_ID,
        name: "Shared Infra",
        managerId: admin.id,
      });
      console.log("created project Shared Infra (Admin-owned, for ACL QA)");
    }
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
