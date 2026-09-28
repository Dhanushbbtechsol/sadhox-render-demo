import { CATALOG_ITEMS } from "../service-catalog/catalog.items";
import { hasRequesterOverride } from "./pipes/reject-requester-override.util";
import {
  createServiceRequest,
  getServiceRequestForUser,
  listCatalogForUser,
  listServiceRequestsForUser,
  resetServiceRequests,
} from "./request-store";

describe("service request access (request-store)", () => {
  const databaseItem = CATALOG_ITEMS.find((item) => item.name === "Database Access")!;
  const laptopItem = CATALOG_ITEMS.find((item) => item.name === "Request Laptop")!;
  const endUser = { id: "user-end-1", name: "Eve EndUser", role: "EndUser" };
  const agent = { id: "user-agent-1", name: "Alice Agent", role: "Agent" };

  beforeEach(() => {
    resetServiceRequests();
  });

  it("filters catalog by allowedRoles for EndUser", () => {
    const endCatalog = listCatalogForUser(endUser);
    expect(endCatalog.ok).toBe(true);
    if (!endCatalog.ok) return;
    expect(endCatalog.data.some((item) => item.name === "Database Access")).toBe(
      false,
    );
    expect(endCatalog.data.some((item) => item.name === "Request Laptop")).toBe(
      true,
    );
  });

  it("denies EndUser creating a restricted catalog item", () => {
    const denied = createServiceRequest(endUser, {
      catalogId: databaseItem.id,
      justification: "Need production access",
      urgency: "High",
      fields: { databaseName: "billing", accessLevel: "Admin" },
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.error.status).toBe(403);
  });

  it("detects client-supplied requesterId/requesterName overrides", () => {
    expect(
      hasRequesterOverride({
        catalogId: laptopItem.id,
        requesterId: "user-admin-1",
      }),
    ).toBe(true);
    expect(
      hasRequesterOverride({
        catalogId: laptopItem.id,
        requesterName: "Imposter",
      }),
    ).toBe(true);
    expect(
      hasRequesterOverride({
        catalogId: laptopItem.id,
        justification: "ok",
        urgency: "High",
        fields: { laptopType: "Developer" },
      }),
    ).toBe(false);
  });

  it("rejects nested requesterId in fields and sets requester from session", () => {
    const smuggled = createServiceRequest(endUser, {
      catalogId: laptopItem.id,
      justification: "Battery no longer holds a charge",
      urgency: "High",
      fields: { laptopType: "Developer", requesterId: "user-admin-1" },
    });
    expect(smuggled.ok).toBe(false);

    const submitted = createServiceRequest(endUser, {
      catalogId: laptopItem.id,
      justification: "Battery no longer holds a charge",
      urgency: "High",
      fields: { laptopType: "Developer" },
    });
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;
    expect(submitted.data.requesterId).toBe(endUser.id);
    expect(submitted.data.requesterId).not.toBe(agent.id);
  });

  it("scopes EndUser list/get to own rows; Agent sees all", () => {
    const submitted = createServiceRequest(endUser, {
      catalogId: laptopItem.id,
      justification: "Battery no longer holds a charge",
      urgency: "High",
      fields: { laptopType: "Developer" },
    });
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;

    const agentView = listServiceRequestsForUser(agent);
    const otherEndUser = listServiceRequestsForUser({
      ...endUser,
      id: "someone-else",
    });
    expect(agentView.ok).toBe(true);
    expect(otherEndUser.ok).toBe(true);
    if (!agentView.ok || !otherEndUser.ok) return;

    expect(agentView.data.some((r) => r.id === submitted.data.id)).toBe(true);
    expect(otherEndUser.data.some((r) => r.id === submitted.data.id)).toBe(
      false,
    );

    const ownGet = getServiceRequestForUser(endUser, submitted.data.id);
    const foreignGet = getServiceRequestForUser(
      { ...endUser, id: "someone-else" },
      submitted.data.id,
    );
    expect(ownGet.ok).toBe(true);
    expect(foreignGet.ok).toBe(false);
    if (!foreignGet.ok) expect(foreignGet.error.status).toBe(404);
  });
});
