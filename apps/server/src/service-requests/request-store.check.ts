import assert from "node:assert/strict";
import { CATALOG_ITEMS } from "../service-catalog/catalog.items";
import {
  createServiceRequest,
  listCatalogForUser,
  listServiceRequestsForUser,
  resetServiceRequests,
} from "./request-store";

const databaseItem = CATALOG_ITEMS.find((item) => item.name === "Database Access");
const laptopItem = CATALOG_ITEMS.find((item) => item.name === "Request Laptop");

const endUser = { id: "user-end-1", name: "Eve EndUser", role: "EndUser" };
const agent = { id: "user-agent-1", name: "Alice Agent", role: "Agent" };

resetServiceRequests();

const endCatalog = listCatalogForUser(endUser);
assert.equal(endCatalog.ok, true);
if (endCatalog.ok) {
  assert.equal(
    endCatalog.data.some((item) => item.name === "Database Access"),
    false,
  );
  assert.equal(
    endCatalog.data.some((item) => item.name === "Request Laptop"),
    true,
  );
}

const denied = createServiceRequest(endUser, {
  catalogId: databaseItem!.id,
  justification: "Need production access",
  urgency: "High",
  fields: { databaseName: "billing", accessLevel: "Admin" },
});
assert.equal(denied.ok, false);
if (!denied.ok) assert.equal(denied.error.status, 403);

const created = createServiceRequest(endUser, {
  catalogId: laptopItem!.id,
  justification: "Battery no longer holds a charge",
  urgency: "High",
  fields: { laptopType: "Developer", requesterId: "user-admin-1" },
});
assert.equal(created.ok, false);

const submitted = createServiceRequest(endUser, {
  catalogId: laptopItem!.id,
  justification: "Battery no longer holds a charge",
  urgency: "High",
  fields: { laptopType: "Developer" },
});
assert.equal(submitted.ok, true);
if (submitted.ok) {
  assert.equal(submitted.data.requesterId, endUser.id);
  assert.notEqual(submitted.data.requesterId, agent.id);
}

const agentView = listServiceRequestsForUser(agent);
const endView = listServiceRequestsForUser({ ...endUser, id: "someone-else" });
assert.equal(agentView.ok, true);
assert.equal(endView.ok, true);
if (agentView.ok && endView.ok && submitted.ok) {
  assert.equal(agentView.data.some((request) => request.id === submitted.data.id), true);
  assert.equal(endView.data.some((request) => request.id === submitted.data.id), false);
}

console.log("service request access checks passed");
