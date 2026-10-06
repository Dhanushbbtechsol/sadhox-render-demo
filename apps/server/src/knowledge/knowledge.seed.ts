export const KNOWLEDGE_CATEGORY_SEED = [
  {
    id: "a1000000-0000-4000-8000-000000000001",
    name: "Getting started",
    slug: "getting-started",
    description: "Basics for reporting issues and using the portal.",
  },
  {
    id: "a1000000-0000-4000-8000-000000000002",
    name: "Network & VPN",
    slug: "network-vpn",
    description: "Connectivity, VPN, and remote access help.",
  },
] as const;

export const KNOWLEDGE_ARTICLE_SEED = [
  {
    id: "a2000000-0000-4000-8000-000000000001",
    title: "How to report an incident",
    slug: "how-to-report-an-incident",
    categoryId: KNOWLEDGE_CATEGORY_SEED[0].id,
    status: "Published" as const,
    body: `Use My Portal → Report an issue.

Include:
1. What you were trying to do
2. Exact error text or screenshot description
3. When it started and whether others are affected

Priority is calculated from impact × urgency — pick honestly so SLA clocks stay accurate.`,
  },
  {
    id: "a2000000-0000-4000-8000-000000000002",
    title: "VPN connection troubleshooting",
    slug: "vpn-connection-troubleshooting",
    categoryId: KNOWLEDGE_CATEGORY_SEED[1].id,
    status: "Published" as const,
    body: `If VPN will not connect:

1. Confirm you are on a trusted network and the corporate VPN app is up to date
2. Toggle Wi‑Fi / Ethernet, then retry
3. Restart the VPN client and sign in again
4. If the error mentions certificate or MFA, open an incident with the full message

Agents can link this article to related network incidents for self-service.`,
  },
  {
    id: "a2000000-0000-4000-8000-000000000003",
    title: "Draft: internal assignment tips",
    slug: "draft-internal-assignment-tips",
    categoryId: KNOWLEDGE_CATEGORY_SEED[0].id,
    status: "Draft" as const,
    body: `Admin-only draft for assignment playbooks. Not visible to End Users or Agents until Published.`,
  },
] as const;
