import { Hono } from "hono";
import { authenticateAccessToken } from "./auth";
import {
  createServiceRequest,
  getServiceRequestForUser,
  listCatalogForUser,
  listServiceRequestsForUser,
} from "../service-requests/request-store";

type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

type Env = {
  Variables: {
    user: SessionUser;
  };
};

async function requireUser(c: { req: { header: (name: string) => string | undefined }; json: (body: unknown, status?: number) => Response; set: (key: "user", user: SessionUser) => void }, next: () => Promise<void>) {
  const user = await authenticateAccessToken(c.req.header("Authorization"));
  if (!user) return c.json({ message: "Unauthorized" }, 401);
  c.set("user", user);
  await next();
}

export const catalogRoutes = new Hono<Env>();
catalogRoutes.use("*", requireUser);
catalogRoutes.get("/", (c) => {
  const result = listCatalogForUser(c.get("user"));
  if (!result.ok) return c.json({ message: result.error.message }, result.error.status);
  return c.json({ data: result.data });
});

export const serviceRequestRoutes = new Hono<Env>();
serviceRequestRoutes.use("*", requireUser);

serviceRequestRoutes.get("/", (c) => {
  const result = listServiceRequestsForUser(c.get("user"));
  if (!result.ok) return c.json({ message: result.error.message }, result.error.status);
  return c.json({ data: result.data });
});

serviceRequestRoutes.get("/:id", (c) => {
  const result = getServiceRequestForUser(c.get("user"), c.req.param("id"));
  if (!result.ok) return c.json({ message: result.error.message }, result.error.status);
  return c.json(result.data);
});

serviceRequestRoutes.post("/", async (c) => {
  const body = await c.req.json<Record<string, unknown>>().catch(() => null);
  if (!body || typeof body !== "object") {
    return c.json({ message: "Invalid request body" }, 400);
  }
  if ("requesterId" in body || "requesterName" in body) {
    return c.json({ message: "Requester is taken from the authenticated session" }, 400);
  }

  const result = createServiceRequest(c.get("user"), {
    catalogId: String(body.catalogId ?? ""),
    justification: typeof body.justification === "string" ? body.justification : "",
    urgency: typeof body.urgency === "string" ? body.urgency : "",
    fields:
      body.fields && typeof body.fields === "object" && !Array.isArray(body.fields)
        ? (body.fields as Record<string, unknown>)
        : {},
  });
  if (!result.ok) return c.json({ message: result.error.message }, result.error.status);
  return c.json(result.data, 201);
});
