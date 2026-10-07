import "dotenv/config";
import * as bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq, like, sql } from "drizzle-orm";
import postgres from "postgres";
import { assertPasswordComplexity } from "../src/common/password-policy";
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
  problems,
  problemIncidents,
  comments,
  notifications,
  ticketKnowledgeLinks,
} from "../src/database/schema";
import {
  KNOWLEDGE_ARTICLE_SEED,
  KNOWLEDGE_CATEGORY_SEED,
} from "../src/knowledge/knowledge.seed";
import { CATALOG_SEED } from "../src/service-catalog/catalog.seed";

const SHOWCASE_PREFIX = "[Showcase]";
const SCENARIO_PREFIX = "[Scenario]";
const SCENARIO_ASSET_PREFIX = "SCEN-";
/** Local demo password — override with SEED_PASSWORD=... if needed. */
const DEFAULT_SEED_PASSWORD = "ChangeMe123!";
const PHASE6_PROJECT_ID = "a1000000-0000-4000-8000-000000000001";
const PHASE6_MODULE_ID = "a1000000-0000-4000-8000-000000000002";
// Second project owned by Admin — Manager/Agent must not see its tickets in scoped lists.
const PHASE6_OTHER_PROJECT_ID = "a1000000-0000-4000-8000-000000000003";
const PHASE6_MODULE_2_ID = "a1000000-0000-4000-8000-000000000004";

const SCENARIO_INCIDENT_IDS = {
  vpnOutage: "c1000000-0000-4000-8000-000000000001",
  laptopBroken: "c1000000-0000-4000-8000-000000000002",
  emailDelay: "c1000000-0000-4000-8000-000000000003",
  printerJam: "c1000000-0000-4000-8000-000000000004",
  accessDenied: "c1000000-0000-4000-8000-000000000005",
  wifiSlow: "c1000000-0000-4000-8000-000000000006",
  appCrash: "c1000000-0000-4000-8000-000000000007",
  dbTimeout: "c1000000-0000-4000-8000-000000000008",
  phoneDown: "c1000000-0000-4000-8000-000000000009",
  badgeFail: "c1000000-0000-4000-8000-00000000000a",
  monitorDead: "c1000000-0000-4000-8000-00000000000b",
  sharedInfra: "c1000000-0000-4000-8000-00000000000c",
} as const;

const SCENARIO_PROBLEM_IDS = {
  vpnRoot: "c2000000-0000-4000-8000-000000000001",
  emailRoot: "c2000000-0000-4000-8000-000000000002",
  wifiKnown: "c2000000-0000-4000-8000-000000000003",
} as const;

async function seed() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }

  const client = postgres(url, { max: 1 });
  const db = drizzle(client);

  const seedPassword = process.env.SEED_PASSWORD ?? DEFAULT_SEED_PASSWORD;
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
      name: "Pat Portal",
    },
    {
      email: "manager@sadhox.local",
      passwordHash,
      role: "Manager" as const,
      name: "Morgan Manager",
    },
    {
      email: "manager2@sadhox.local",
      passwordHash,
      role: "Manager" as const,
      name: "Casey Manager",
    },
  ];

  let createdAny = false;
  for (const u of seedUsers) {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, u.email))
      .limit(1);
    if (existing) {
      await db
        .update(users)
        .set({
          passwordHash: u.passwordHash,
          name: u.name,
          role: u.role,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing.id));
      console.log(`synced password for ${u.email}`);
      continue;
    }
    await db.insert(users).values(u);
    createdAny = true;
    console.log(`created ${u.role} ${u.email}`);
  }

  {
    const { writeFileSync } = await import("node:fs");
    writeFileSync(".seed-password", seedPassword, { mode: 0o600 });
    console.log("");
    console.log("=== SEED PASSWORD (synced for all seed role emails) ===");
    console.log(seedPassword);
    console.log("=======================================================");
    console.log("Wrote apps/server/.seed-password (gitignored).");
    console.log(
      createdAny
        ? "New users were created this run."
        : "Existing seed users updated (password hash synced).",
    );
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
  await seedScenarioNarrative(db);

  await client.end();
  console.log("Seed complete");
}

async function seedPhase6Projects(db: SeedDb) {
  const [manager] = await db
    .select()
    .from(users)
    .where(eq(users.email, "manager@sadhox.local"))
    .limit(1);
  const [manager2] = await db
    .select()
    .from(users)
    .where(eq(users.email, "manager2@sadhox.local"))
    .limit(1);
  const [agent] = await db
    .select()
    .from(users)
    .where(eq(users.email, "agent@sadhox.local"))
    .limit(1);

  if (!manager) {
    console.log("skip phase6 projects (manager user missing)");
    return;
  }

  const [existing] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, PHASE6_PROJECT_ID))
    .limit(1);

  if (!existing) {
    await db.insert(projects).values({
      id: PHASE6_PROJECT_ID,
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
    .where(eq(modules.id, PHASE6_MODULE_ID))
    .limit(1);
  if (!mod) {
    await db.insert(modules).values({
      id: PHASE6_MODULE_ID,
      projectId: PHASE6_PROJECT_ID,
      name: "Core Services",
    });
    console.log("created module Core Services");
  }

  const [mod2] = await db
    .select({ id: modules.id })
    .from(modules)
    .where(eq(modules.id, PHASE6_MODULE_2_ID))
    .limit(1);
  if (!mod2) {
    await db.insert(modules).values({
      id: PHASE6_MODULE_2_ID,
      projectId: PHASE6_PROJECT_ID,
      name: "End-User Devices",
    });
    console.log("created module End-User Devices");
  }

  if (agent) {
    await db
      .insert(projectMembers)
      .values({ projectId: PHASE6_PROJECT_ID, userId: agent.id })
      .onConflictDoNothing();
    console.log("ensured agent membership on Platform Ops");
  }

  // Second Manager-owned project — appears in Manager select QA as another option owner.
  if (manager2) {
    const [other] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.id, PHASE6_OTHER_PROJECT_ID))
      .limit(1);
    if (!other) {
      await db.insert(projects).values({
        id: PHASE6_OTHER_PROJECT_ID,
        name: "Shared Infra",
        managerId: manager2.id,
      });
      console.log("created project Shared Infra (Casey Manager)");
    }
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
  console.log("attached open showcase incidents to phase 6 project");
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

/**
 * Coherent Platform Ops week for Admin / Agent / Manager / EndUser portals.
 * Idempotent via [Scenario] title prefix — safe when [Showcase] data already exists.
 */
async function seedScenarioNarrative(db: SeedDb) {
  const [existing] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(incidents)
    .where(like(incidents.title, `${SCENARIO_PREFIX}%`));

  if (Number(existing?.n ?? 0) > 0) {
    console.log("skip scenario narrative (already present)");
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
  const [portalUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, "user@sadhox.local"))
    .limit(1);
  const [endUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, "enduser@sadhox.local"))
    .limit(1);
  const [manager] = await db
    .select()
    .from(users)
    .where(eq(users.email, "manager@sadhox.local"))
    .limit(1);

  if (!admin || !agent || !portalUser || !manager) {
    console.log("skip scenario narrative — required seed users missing");
    return;
  }

  const catalogId = CATALOG_SEED[0]?.id;
  if (!catalogId) {
    console.log("skip scenario narrative — catalog seed empty");
    return;
  }

  const [proj] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, PHASE6_PROJECT_ID))
    .limit(1);
  if (!proj) {
    console.log("skip scenario narrative — Platform Ops project missing");
    return;
  }

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const requesterAlt = endUser?.id ?? portalUser.id;

  type IncRow = {
    id: string;
    title: string;
    description: string;
    category: string;
    priority: "P1" | "P2" | "P3" | "P4";
    impact: "High" | "Medium" | "Low";
    urgency: "High" | "Medium" | "Low";
    status: "New" | "Assigned" | "InProgress" | "Resolved" | "Closed";
    reporterId: string;
    assignedTo: string | null;
    projectId: string | null;
    moduleId: string | null;
    resolutionNotes?: string | null;
    resolvedAt?: Date | null;
    closedAt?: Date | null;
  };

  const incidentRows: IncRow[] = [
    {
      id: SCENARIO_INCIDENT_IDS.vpnOutage,
      title: `${SCENARIO_PREFIX} VPN gateway intermittent for Platform Ops`,
      description:
        "Users on Platform Ops cannot stay connected to VPN longer than ~5 minutes. Started Monday morning.",
      category: "Network",
      priority: "P1",
      impact: "High",
      urgency: "High",
      status: "InProgress",
      reporterId: portalUser.id,
      assignedTo: agent.id,
      projectId: PHASE6_PROJECT_ID,
      moduleId: PHASE6_MODULE_ID,
    },
    {
      id: SCENARIO_INCIDENT_IDS.laptopBroken,
      title: `${SCENARIO_PREFIX} Laptop screen flicker after docking`,
      description: "Display blanks when docked; works undocked. Hinders remote work.",
      category: "Hardware",
      priority: "P2",
      impact: "Medium",
      urgency: "High",
      status: "Assigned",
      reporterId: portalUser.id,
      assignedTo: agent.id,
      projectId: PHASE6_PROJECT_ID,
      moduleId: PHASE6_MODULE_2_ID,
    },
    {
      id: SCENARIO_INCIDENT_IDS.emailDelay,
      title: `${SCENARIO_PREFIX} Outbound mail delayed 30+ minutes`,
      description: "Messages sit in Outbox then batch-send. Affects approvals.",
      category: "Software",
      priority: "P2",
      impact: "High",
      urgency: "Medium",
      status: "Assigned",
      reporterId: requesterAlt,
      assignedTo: agent.id,
      projectId: PHASE6_PROJECT_ID,
      moduleId: PHASE6_MODULE_ID,
    },
    {
      id: SCENARIO_INCIDENT_IDS.printerJam,
      title: `${SCENARIO_PREFIX} Floor-3 printer paper jam loop`,
      description: "Printer reports jam even after clearing tray.",
      category: "Hardware",
      priority: "P3",
      impact: "Low",
      urgency: "Medium",
      status: "New",
      reporterId: portalUser.id,
      assignedTo: null,
      projectId: PHASE6_PROJECT_ID,
      moduleId: PHASE6_MODULE_2_ID,
    },
    {
      id: SCENARIO_INCIDENT_IDS.accessDenied,
      title: `${SCENARIO_PREFIX} SharePoint site access denied after role change`,
      description: "Pat Portal lost write access to Ops handbook site.",
      category: "Access",
      priority: "P2",
      impact: "Medium",
      urgency: "High",
      status: "InProgress",
      reporterId: portalUser.id,
      assignedTo: agent.id,
      projectId: PHASE6_PROJECT_ID,
      moduleId: PHASE6_MODULE_ID,
    },
    {
      id: SCENARIO_INCIDENT_IDS.wifiSlow,
      title: `${SCENARIO_PREFIX} Conference room Wi-Fi throughput drop`,
      description: "Speed tests under 5 Mbps during standup; AP reboot temporary fix.",
      category: "Network",
      priority: "P3",
      impact: "Medium",
      urgency: "Medium",
      status: "InProgress",
      reporterId: requesterAlt,
      assignedTo: agent.id,
      projectId: PHASE6_PROJECT_ID,
      moduleId: PHASE6_MODULE_ID,
    },
    {
      id: SCENARIO_INCIDENT_IDS.appCrash,
      title: `${SCENARIO_PREFIX} Softphone client crash on call answer`,
      description: "App exits when accepting inbound calls on Windows 11.",
      category: "Software",
      priority: "P2",
      impact: "High",
      urgency: "High",
      status: "Resolved",
      reporterId: portalUser.id,
      assignedTo: agent.id,
      projectId: PHASE6_PROJECT_ID,
      moduleId: PHASE6_MODULE_2_ID,
      resolutionNotes: "Reinstalled softphone build 4.2.1; crash no longer reproduces.",
      resolvedAt: new Date(now - day),
    },
    {
      id: SCENARIO_INCIDENT_IDS.dbTimeout,
      title: `${SCENARIO_PREFIX} Reporting DB query timeouts at 09:00`,
      description: "Batch report job times out during morning peak.",
      category: "Other",
      priority: "P1",
      impact: "High",
      urgency: "High",
      status: "Assigned",
      reporterId: admin.id,
      assignedTo: agent.id,
      projectId: PHASE6_PROJECT_ID,
      moduleId: PHASE6_MODULE_ID,
    },
    {
      id: SCENARIO_INCIDENT_IDS.phoneDown,
      title: `${SCENARIO_PREFIX} Desk phone no dial tone`,
      description: "Handset shows registered but no dial tone on pickup.",
      category: "Hardware",
      priority: "P3",
      impact: "Low",
      urgency: "Low",
      status: "Closed",
      reporterId: portalUser.id,
      assignedTo: agent.id,
      projectId: PHASE6_PROJECT_ID,
      moduleId: PHASE6_MODULE_2_ID,
      resolutionNotes: "Replaced PoE injector; dial tone restored.",
      resolvedAt: new Date(now - 2 * day),
      closedAt: new Date(now - day),
    },
    {
      id: SCENARIO_INCIDENT_IDS.badgeFail,
      title: `${SCENARIO_PREFIX} Badge reader rejects valid cards`,
      description: "Building B lobby reader beeps red for Ops badges.",
      category: "Access",
      priority: "P3",
      impact: "Medium",
      urgency: "Medium",
      status: "New",
      reporterId: requesterAlt,
      assignedTo: null,
      projectId: PHASE6_PROJECT_ID,
      moduleId: PHASE6_MODULE_ID,
    },
    {
      id: SCENARIO_INCIDENT_IDS.monitorDead,
      title: `${SCENARIO_PREFIX} Dual-monitor blank on HDMI hub`,
      description: "Second monitor stays black after docking station firmware update.",
      category: "Hardware",
      priority: "P4",
      impact: "Low",
      urgency: "Low",
      status: "Resolved",
      reporterId: portalUser.id,
      assignedTo: agent.id,
      projectId: PHASE6_PROJECT_ID,
      moduleId: PHASE6_MODULE_2_ID,
      resolutionNotes: "Rolled hub firmware; DisplayPort preferred path documented.",
      resolvedAt: new Date(now - 3 * day),
    },
    {
      id: SCENARIO_INCIDENT_IDS.sharedInfra,
      title: `${SCENARIO_PREFIX} Shared Infra backup window overrun`,
      description:
        "Admin-owned Shared Infra ticket — Manager must not see this in scoped lists.",
      category: "Other",
      priority: "P2",
      impact: "Medium",
      urgency: "Medium",
      status: "New",
      reporterId: admin.id,
      assignedTo: null,
      projectId: PHASE6_OTHER_PROJECT_ID,
      moduleId: null,
    },
  ];

  for (const row of incidentRows) {
    await db.insert(incidents).values({
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      priority: row.priority,
      impact: row.impact,
      urgency: row.urgency,
      status: row.status,
      assignedTo: row.assignedTo,
      reporterId: row.reporterId,
      projectId: row.projectId,
      moduleId: row.moduleId,
      slaDueAt: new Date(now + 2 * day),
      resolutionNotes: row.resolutionNotes ?? null,
      resolvedAt: row.resolvedAt ?? null,
      closedAt: row.closedAt ?? null,
    });
  }

  await db.insert(problems).values([
    {
      id: SCENARIO_PROBLEM_IDS.vpnRoot,
      title: `${SCENARIO_PREFIX} Recurring VPN disconnect pattern`,
      description:
        "Multiple Platform Ops incidents point to gateway session timeout after firmware 9.1.",
      rootCause: null,
      knownError: false,
      status: "Investigating",
      assignedTo: agent.id,
      projectId: PHASE6_PROJECT_ID,
      moduleId: PHASE6_MODULE_ID,
    },
    {
      id: SCENARIO_PROBLEM_IDS.emailRoot,
      title: `${SCENARIO_PREFIX} Mail relay queue backlog mornings`,
      description: "Outbound delays correlate with nightly archive job overlapping SMTP peak.",
      rootCause: "Archive job holds relay worker threads until 09:15.",
      knownError: false,
      status: "Open",
      assignedTo: agent.id,
      projectId: PHASE6_PROJECT_ID,
      moduleId: PHASE6_MODULE_ID,
    },
    {
      id: SCENARIO_PROBLEM_IDS.wifiKnown,
      title: `${SCENARIO_PREFIX} Known error — conference AP channel overlap`,
      description: "Documented channel clash between adjacent APs in standup rooms.",
      rootCause: "AP-12 and AP-14 both fixed on channel 36.",
      knownError: true,
      status: "KnownError",
      assignedTo: agent.id,
      projectId: PHASE6_PROJECT_ID,
      moduleId: PHASE6_MODULE_ID,
    },
  ]);

  await db.insert(problemIncidents).values([
    {
      problemId: SCENARIO_PROBLEM_IDS.vpnRoot,
      incidentId: SCENARIO_INCIDENT_IDS.vpnOutage,
    },
    {
      problemId: SCENARIO_PROBLEM_IDS.emailRoot,
      incidentId: SCENARIO_INCIDENT_IDS.emailDelay,
    },
    {
      problemId: SCENARIO_PROBLEM_IDS.wifiKnown,
      incidentId: SCENARIO_INCIDENT_IDS.wifiSlow,
    },
  ]);

  const srStatuses = [
    "Submitted",
    "PendingApproval",
    "Approved",
    "InFulfillment",
    "Fulfilled",
    "Closed",
  ] as const;

  for (const [i, status] of srStatuses.entries()) {
    const needsApprover =
      status !== "Submitted" && status !== "PendingApproval";
    await db.insert(serviceRequests).values({
      catalogId,
      requesterId: portalUser.id,
      approverId: needsApprover ? (i % 2 === 0 ? manager.id : admin.id) : null,
      title: `${SCENARIO_PREFIX} SR ${status} — laptop accessories`,
      description: "Scenario service request for portal + approval walkthroughs.",
      justification: "Platform Ops onboarding kit for Pat Portal.",
      urgency: i % 2 === 0 ? "Medium" : "High",
      fields: { laptopType: "Standard", accessories: "Dock + monitor" },
      status,
      assigneeId:
        status === "InFulfillment" || status === "Fulfilled" || status === "Closed"
          ? agent.id
          : null,
      approvedAt: needsApprover ? new Date(now - i * day) : null,
      fulfillmentNotes:
        status === "Fulfilled" || status === "Closed"
          ? "Shipped dock + 27in monitor; asset tagged SCEN-HW-0001."
          : null,
      fulfilledAt:
        status === "Fulfilled" || status === "Closed"
          ? new Date(now - Math.max(i - 3, 0) * day)
          : null,
      projectId: PHASE6_PROJECT_ID,
      moduleId: PHASE6_MODULE_2_ID,
    });
  }

  const changeRows: {
    title: string;
    type: "Standard" | "Normal" | "Emergency";
    status:
      | "Submitted"
      | "Approved"
      | "Scheduled"
      | "Implemented"
      | "Closed";
    projectId: string | null;
    moduleId: string | null;
    approvedBy: string | null;
  }[] = [
    {
      title: `${SCENARIO_PREFIX} VPN firmware rollback window`,
      type: "Emergency",
      status: "Submitted",
      projectId: PHASE6_PROJECT_ID,
      moduleId: PHASE6_MODULE_ID,
      approvedBy: null,
    },
    {
      title: `${SCENARIO_PREFIX} Softphone client push to Ops laptops`,
      type: "Normal",
      status: "Approved",
      projectId: PHASE6_PROJECT_ID,
      moduleId: PHASE6_MODULE_2_ID,
      approvedBy: manager.id,
    },
    {
      title: `${SCENARIO_PREFIX} Mail archive job schedule shift`,
      type: "Normal",
      status: "Scheduled",
      projectId: PHASE6_PROJECT_ID,
      moduleId: PHASE6_MODULE_ID,
      approvedBy: admin.id,
    },
    {
      title: `${SCENARIO_PREFIX} Conference AP channel replan`,
      type: "Standard",
      status: "Implemented",
      projectId: PHASE6_PROJECT_ID,
      moduleId: PHASE6_MODULE_ID,
      approvedBy: manager.id,
    },
    {
      title: `${SCENARIO_PREFIX} Badge reader firmware patch Building B`,
      type: "Normal",
      status: "Closed",
      projectId: PHASE6_PROJECT_ID,
      moduleId: PHASE6_MODULE_ID,
      approvedBy: admin.id,
    },
    {
      title: `${SCENARIO_PREFIX} Shared Infra storage maintenance`,
      type: "Standard",
      status: "Approved",
      projectId: PHASE6_OTHER_PROJECT_ID,
      moduleId: null,
      approvedBy: admin.id,
    },
  ];

  for (const row of changeRows) {
    await db.insert(changes).values({
      title: row.title,
      description: "Scenario change for Platform Ops / Shared Infra walkthroughs.",
      type: row.type,
      status: row.status,
      createdBy: agent.id,
      approvedBy: row.approvedBy,
      approvedAt: row.approvedBy ? new Date(now - 2 * day) : null,
      scheduledStart: new Date(now + day),
      scheduledEnd: new Date(now + 2 * day),
      rollbackPlan: "Revert to previous config snapshot within 30 minutes.",
      projectId: row.projectId,
      moduleId: row.moduleId,
    });
  }

  await db.insert(comments).values([
    {
      ticketId: SCENARIO_INCIDENT_IDS.vpnOutage,
      ticketType: "incident",
      authorId: portalUser.id,
      content: "Still dropping every few minutes on the home office connection.",
    },
    {
      ticketId: SCENARIO_INCIDENT_IDS.vpnOutage,
      ticketType: "incident",
      authorId: agent.id,
      content: "Gathering gateway logs; will try session timeout tweak tonight.",
    },
    {
      ticketId: SCENARIO_INCIDENT_IDS.laptopBroken,
      ticketType: "incident",
      authorId: agent.id,
      content: "Please try a different USB-C cable and confirm if flicker persists.",
    },
    {
      ticketId: SCENARIO_INCIDENT_IDS.accessDenied,
      ticketType: "incident",
      authorId: portalUser.id,
      content: "Need write access restored before Friday handbook update.",
    },
  ]);

  const publishedArticleId = KNOWLEDGE_ARTICLE_SEED.find(
    (a) => a.status === "Published",
  )?.id;
  const vpnArticleId =
    KNOWLEDGE_ARTICLE_SEED.find((a) => a.slug === "vpn-access-checklist")?.id ??
    publishedArticleId;
  if (publishedArticleId && vpnArticleId) {
    await db.insert(ticketKnowledgeLinks).values([
      {
        ticketId: SCENARIO_INCIDENT_IDS.laptopBroken,
        ticketType: "incident",
        articleId: publishedArticleId,
      },
      {
        ticketId: SCENARIO_INCIDENT_IDS.accessDenied,
        ticketType: "incident",
        articleId: vpnArticleId,
      },
      {
        ticketId: SCENARIO_PROBLEM_IDS.wifiKnown,
        ticketType: "problem",
        articleId: publishedArticleId,
      },
    ]);
  }

  await db.insert(notifications).values([
    {
      userId: agent.id,
      type: "ticket.assigned",
      title: `${SCENARIO_PREFIX} Assigned: VPN gateway intermittent`,
      body: "P1 incident on Platform Ops needs attention.",
      readAt: null,
    },
    {
      userId: portalUser.id,
      type: "ticket.comment",
      title: `${SCENARIO_PREFIX} Agent replied on your laptop ticket`,
      body: "Alice Agent asked you to try a different USB-C cable.",
      readAt: null,
    },
    {
      userId: manager.id,
      type: "request.pending_approval",
      title: `${SCENARIO_PREFIX} SR awaiting approval`,
      body: "Laptop accessories request from Pat Portal is pending approval.",
      readAt: null,
    },
    {
      userId: portalUser.id,
      type: "request.fulfilled",
      title: `${SCENARIO_PREFIX} Your accessories request was fulfilled`,
      body: "Dock + monitor shipped; see asset SCEN-HW-0001.",
      readAt: new Date(now - day),
    },
  ]);

  await db.insert(assets).values([
    {
      assetTag: `${SCENARIO_ASSET_PREFIX}HW-0001`,
      name: `${SCENARIO_PREFIX} Docking station (Pat Portal)`,
      type: "Hardware",
      status: "Active",
      ownerId: portalUser.id,
      purchaseCost: "189.00",
      linkedTicketId: SCENARIO_INCIDENT_IDS.laptopBroken,
    },
    {
      assetTag: `${SCENARIO_ASSET_PREFIX}HW-0002`,
      name: `${SCENARIO_PREFIX} Softphone headset`,
      type: "Hardware",
      status: "InRepair",
      ownerId: agent.id,
      purchaseCost: "79.50",
      linkedTicketId: SCENARIO_INCIDENT_IDS.appCrash,
    },
    {
      assetTag: `${SCENARIO_ASSET_PREFIX}SW-0001`,
      name: `${SCENARIO_PREFIX} Softphone license seat`,
      type: "Software",
      status: "Active",
      ownerId: admin.id,
      purchaseCost: "24.00",
      linkedTicketId: null,
    },
    {
      assetTag: `${SCENARIO_ASSET_PREFIX}HW-0003`,
      name: `${SCENARIO_PREFIX} VPN token fob`,
      type: "Hardware",
      status: "Active",
      ownerId: portalUser.id,
      purchaseCost: "45.00",
      linkedTicketId: SCENARIO_INCIDENT_IDS.vpnOutage,
    },
  ]);

  console.log(
    `scenario seeded: ${incidentRows.length} incidents, 3 problems, ${srStatuses.length} SRs, ${changeRows.length} changes, comments, notifications, KB links, SCEN- assets`,
  );
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
