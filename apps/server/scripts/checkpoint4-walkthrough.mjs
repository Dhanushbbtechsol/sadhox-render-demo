/**
 * Phase 4 Day 16 walkthrough — Dev B
 *
 * Requires API up with seeded users (SEED_PASSWORD), DATABASE_URL, REDIS_URL.
 *
 * Walkthrough 1: EndUser laptop SR → Admin approve → Agent fulfill
 * Walkthrough 2: Agent Normal Change → Admin approve → Scheduled → Implemented
 *
 * Usage:
 *   SEED_PASSWORD=... DATABASE_URL=... REDIS_URL=... node scripts/checkpoint4-walkthrough.mjs
 */

const BASE = process.env.API_URL ?? "http://127.0.0.1:3000";
const password = process.env.SEED_PASSWORD;
const LAPTOP_CATALOG_ID = "11111111-1111-4111-8111-111111111111";

if (!password) {
  console.error("SEED_PASSWORD required");
  process.exit(1);
}

async function login(email) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  if (!res.ok || !body.accessToken) {
    throw new Error(`login failed for ${email}: ${res.status} ${JSON.stringify(body)}`);
  }
  return body.accessToken;
}

async function api(token, method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, body: json };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  console.log("=== Checkpoint 4 walkthrough (Dev B Phase 4) ===");
  console.log("API", BASE);

  const endUserToken = await login("enduser@sadhox.local");
  const adminToken = await login("admin@sadhox.local");
  const agentToken = await login("agent@sadhox.local");
  console.log("LOGIN ok for EndUser / Admin / Agent");

  // --- Walkthrough 1: laptop request lifecycle ---
  const createSr = await api(endUserToken, "POST", "/service-requests", {
    catalogId: LAPTOP_CATALOG_ID,
    justification: "Phase4 walkthrough — need a developer laptop",
    urgency: "High",
    fields: { laptopType: "Developer" },
  });
  console.log("SR_CREATE", createSr.status, createSr.body?.id ?? createSr.body);
  assert(createSr.status === 201 || createSr.status === 200, "SR create failed");
  const srId = createSr.body.id;

  const tamper = await api(endUserToken, "POST", "/service-requests", {
    catalogId: LAPTOP_CATALOG_ID,
    justification: "tamper attempt",
    urgency: "Low",
    status: "Approved",
  });
  console.log("SR_TAMPER_STATUS", tamper.status);
  assert(tamper.status === 400, "Expected 400 when EndUser sends status");

  const endUserApprove = await api(
    endUserToken,
    "PATCH",
    `/service-requests/${srId}/approve`,
  );
  console.log("SR_ENDUSER_APPROVE", endUserApprove.status);
  assert(endUserApprove.status === 403, "EndUser must not approve");

  const approveSr = await api(
    adminToken,
    "PATCH",
    `/service-requests/${srId}/approve`,
  );
  console.log("SR_APPROVE", approveSr.status, approveSr.body?.status);
  assert(approveSr.status === 200, "Admin approve failed");
  assert(
    String(approveSr.body?.status).includes("Approved"),
    "Expected Approved status",
  );

  const startFul = await api(
    agentToken,
    "PATCH",
    `/service-requests/${srId}/start-fulfillment`,
  );
  console.log("SR_START_FULFILL", startFul.status, startFul.body?.status);
  assert(startFul.status === 200, "start-fulfillment failed");

  const fulfill = await api(
    agentToken,
    "PATCH",
    `/service-requests/${srId}/fulfill`,
    { notes: "Laptop imaged and handed to requester" },
  );
  console.log("SR_FULFILL", fulfill.status, fulfill.body?.status);
  assert(fulfill.status === 200, "fulfill failed");
  assert(
    String(fulfill.body?.status).includes("Fulfilled"),
    "Expected Fulfilled",
  );

  // --- Walkthrough 2: Normal change → Implemented ---
  const start = new Date(Date.now() + 86400000).toISOString();
  const end = new Date(Date.now() + 2 * 86400000).toISOString();
  const badWindow = await api(agentToken, "POST", "/changes", {
    title: "Phase4 bad window",
    description: "end before start",
    type: "Normal",
    scheduledStart: end,
    scheduledEnd: start,
    rollbackPlan: "revert",
  });
  console.log("CHG_BAD_WINDOW", badWindow.status);
  assert(badWindow.status === 400, "Expected 400 for end <= start");

  const noRollback = await api(agentToken, "POST", "/changes", {
    title: "Phase4 missing rollback",
    description: "Normal without rollback",
    type: "Normal",
    scheduledStart: start,
    scheduledEnd: end,
    rollbackPlan: "",
  });
  console.log("CHG_NO_ROLLBACK", noRollback.status);
  assert(noRollback.status === 400, "Expected 400 for empty Normal rollback");

  const createChg = await api(agentToken, "POST", "/changes", {
    title: "Phase4 Normal change walkthrough",
    description: "Scheduled downtime with rollback plan",
    type: "Normal",
    scheduledStart: start,
    scheduledEnd: end,
    rollbackPlan: "Restore previous config from backup snapshot",
  });
  console.log("CHG_CREATE", createChg.status, createChg.body?.id ?? createChg.body);
  assert(createChg.status === 201 || createChg.status === 200, "change create failed");
  const changeId = createChg.body.id;

  const approveChg = await api(adminToken, "PATCH", `/changes/${changeId}/approve`);
  console.log("CHG_APPROVE", approveChg.status, approveChg.body?.status);
  assert(approveChg.status === 200, "change approve failed");

  const schedule = await api(adminToken, "PATCH", `/changes/${changeId}`, {
    status: "Scheduled",
  });
  console.log("CHG_SCHEDULE", schedule.status, schedule.body?.status);
  assert(schedule.status === 200, "schedule failed");

  const implement = await api(adminToken, "PATCH", `/changes/${changeId}`, {
    status: "Implemented",
  });
  console.log("CHG_IMPLEMENT", implement.status, implement.body?.status);
  assert(implement.status === 200, "implement failed");
  assert(
    String(implement.body?.status).includes("Implemented"),
    "Expected Implemented",
  );

  console.log("=== Checkpoint 4 walkthrough PASSED ===");
}

main().catch((err) => {
  console.error("FAILED", err instanceof Error ? err.message : err);
  process.exit(1);
});
