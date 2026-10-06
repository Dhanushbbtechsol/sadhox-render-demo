/**
 * Seed categories align with service catalog departments so Dev B can resolve
 * "Related help articles" via category name === catalog item.department.
 */
export const KNOWLEDGE_SEED = {
  categories: [
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
  ],
  articles: [
    {
      id: "b1111111-1111-4111-8111-111111111111",
      title: "Requesting a laptop",
      slug: "requesting-a-laptop",
      body: `Use the Service Catalog item **Request Laptop** when you need a new workstation.

Before you submit:
1. Confirm whether you need a Standard, Developer, or Executive build.
2. Note any docking station or monitor requirements in the justification.
3. Your manager may be asked to approve the request.

Typical fulfillment time is 3–5 business days after approval.`,
      status: "Published" as const,
      categoryId: "a1111111-1111-4111-8111-111111111111",
    },
    {
      id: "b2222222-2222-4222-8222-222222222222",
      title: "VPN access checklist",
      slug: "vpn-access-checklist",
      body: `Remote VPN access is requested through the **VPN Access** catalog item.

Steps:
1. Choose the access duration you need (30 days, 90 days, or 1 year).
2. Explain the business reason in the justification field.
3. Install the company VPN client after the request is fulfilled.

If you already have access but cannot connect, report an incident from My Portal instead of opening a new access request.`,
      status: "Published" as const,
      categoryId: "a2222222-2222-4222-8222-222222222222",
    },
    {
      id: "b3333333-3333-4333-8333-333333333333",
      title: "Database access roles",
      slug: "database-access-roles",
      body: `Use **Database Access** in the catalog to request Read, Write, or Admin rights.

Guidelines:
- Prefer Read unless you need to change data.
- Name the exact database in the form field.
- Admin access requires Admin approval and a clear rollback plan for changes.

Related catalog department: Data.`,
      status: "Published" as const,
      categoryId: "a3333333-3333-4333-8333-333333333333",
    },
    {
      id: "b4444444-4444-4444-8444-444444444444",
      title: "Draft: hardware lifecycle (internal)",
      slug: "draft-hardware-lifecycle",
      body: "Internal draft about refresh cycles. Not visible to End User or Agent until Published.",
      status: "Draft" as const,
      categoryId: "a1111111-1111-4111-8111-111111111111",
    },
  ],
};
