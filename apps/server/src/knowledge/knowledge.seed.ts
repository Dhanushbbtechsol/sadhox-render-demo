/**
 * Category names align with service catalog `department` so Related help
 * can resolve articles via category name === catalog item.department.
 */
export const KNOWLEDGE_CATEGORY_SEED = [
  {
    id: "a1111111-1111-4111-8111-111111111111",
    name: "IT Hardware",
    slug: "it-hardware",
    description: "Laptops, peripherals, and workstation hardware help.",
  },
  {
    id: "a2222222-2222-4222-8222-222222222222",
    name: "Access",
    slug: "access",
    description: "VPN, accounts, and identity access guides.",
  },
  {
    id: "a3333333-3333-4333-8333-333333333333",
    name: "Data",
    slug: "data",
    description: "Database access and data platform how-tos.",
  },
] as const;

export const KNOWLEDGE_ARTICLE_SEED = [
  {
    id: "b1111111-1111-4111-8111-111111111111",
    title: "Requesting a laptop",
    slug: "requesting-a-laptop",
    categoryId: KNOWLEDGE_CATEGORY_SEED[0].id,
    status: "Published" as const,
    body: `Use the Service Catalog item **Request Laptop** when you need a new workstation.

Before you submit:
1. Confirm whether you need a Standard, Developer, or Executive build.
2. Note any docking station or monitor requirements in the justification.
3. Your manager may be asked to approve the request.

Typical fulfillment time is 3–5 business days after approval.`,
  },
  {
    id: "b2222222-2222-4222-8222-222222222222",
    title: "VPN access checklist",
    slug: "vpn-access-checklist",
    categoryId: KNOWLEDGE_CATEGORY_SEED[1].id,
    status: "Published" as const,
    body: `Remote VPN access is requested through the **VPN Access** catalog item.

Steps:
1. Choose the access duration you need (30 days, 90 days, or 1 year).
2. Explain the business reason in the justification field.
3. Install the company VPN client after the request is fulfilled.

If you already have access but cannot connect, report an incident from My Portal instead of opening a new access request.`,
  },
  {
    id: "b3333333-3333-4333-8333-333333333333",
    title: "Database access roles",
    slug: "database-access-roles",
    categoryId: KNOWLEDGE_CATEGORY_SEED[2].id,
    status: "Published" as const,
    body: `Use **Database Access** in the catalog to request Read, Write, or Admin rights.

Guidelines:
- Prefer Read unless you need to change data.
- Name the exact database in the form field.
- Admin access requires Admin approval and a clear rollback plan for changes.

Related catalog department: Data.`,
  },
  {
    id: "b4444444-4444-4444-8444-444444444444",
    title: "How to report an incident",
    slug: "how-to-report-an-incident",
    categoryId: KNOWLEDGE_CATEGORY_SEED[1].id,
    status: "Published" as const,
    body: `Use My Portal → Report an issue.

Include:
1. What you were trying to do
2. Exact error text or screenshot description
3. When it started and whether others are affected

Priority is calculated from impact × urgency — pick honestly so SLA clocks stay accurate.`,
  },
  {
    id: "b5555555-5555-4555-8555-555555555555",
    title: "Draft: hardware lifecycle (internal)",
    slug: "draft-hardware-lifecycle",
    categoryId: KNOWLEDGE_CATEGORY_SEED[0].id,
    status: "Draft" as const,
    body: "Internal draft about refresh cycles. Not visible to End User or Agent until Published.",
  },
] as const;
