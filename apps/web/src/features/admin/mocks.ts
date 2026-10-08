import type {
  AdminStats,
  Asset,
  AuditLog,
  KnowledgeArticle,
  KnowledgeCategory,
  SlaRule,
} from "./types";

/** Used when Nest/DB is unreachable or the session is a DEV mock token. */
export const mockAssets: Asset[] = [
  {
    id: "ast-001",
    assetTag: "HW-1042",
    name: "Dell Latitude 5540",
    type: "Hardware",
    status: "Active",
    ownerId: null,
    ownerName: "Alice Chen",
    linkedTicketId: null,
    linkedTicketCount: 2,
    createdAt: "2026-09-20T10:00:00Z",
    updatedAt: "2026-09-24T09:00:00Z",
  },
  {
    id: "ast-002",
    assetTag: "HW-1108",
    name: "ThinkPad docking station",
    type: "Hardware",
    status: "Active",
    ownerId: null,
    ownerName: "Unassigned",
    linkedTicketId: null,
    linkedTicketCount: 0,
    createdAt: "2026-09-21T10:00:00Z",
    updatedAt: "2026-09-21T10:00:00Z",
  },
  {
    id: "ast-003",
    assetTag: "SW-2201",
    name: "Microsoft 365 E3",
    type: "Software",
    status: "Active",
    ownerId: null,
    ownerName: "Finance",
    linkedTicketId: null,
    linkedTicketCount: 1,
    createdAt: "2026-09-18T10:00:00Z",
    updatedAt: "2026-09-22T10:00:00Z",
  },
  {
    id: "ast-004",
    assetTag: "SW-2314",
    name: "Adobe Acrobat Pro",
    type: "Software",
    status: "InRepair",
    ownerId: null,
    ownerName: "Priya Nair",
    linkedTicketId: null,
    linkedTicketCount: 1,
    createdAt: "2026-09-19T10:00:00Z",
    updatedAt: "2026-09-25T08:00:00Z",
  },
  {
    id: "ast-005",
    assetTag: "HW-0988",
    name: "HP LaserJet MFP",
    type: "Hardware",
    status: "Retired",
    ownerId: null,
    ownerName: "Reception",
    linkedTicketId: null,
    linkedTicketCount: 0,
    createdAt: "2026-08-01T10:00:00Z",
    updatedAt: "2026-09-10T10:00:00Z",
  },
];

export const mockAdminStats: AdminStats = {
  kpis: [
    { id: "total", label: "Total tickets", value: "186", delta: "Offline mock", trend: "flat" },
    { id: "open", label: "Open tickets", value: "47", delta: "Offline mock", trend: "down" },
    { id: "p1", label: "P1 incidents", value: "3", delta: "Offline mock", trend: "flat" },
    { id: "sla", label: "SLA compliance", value: "94%", delta: "Offline mock", trend: "up" },
  ],
  ticketsByStatus: [
    { label: "New", count: 18 },
    { label: "In Progress", count: 29 },
    { label: "Resolved", count: 86 },
    { label: "Closed", count: 53 },
  ],
  ticketsByPriority: [
    { label: "P1", count: 3 },
    { label: "P2", count: 21 },
    { label: "P3", count: 74 },
    { label: "P4", count: 88 },
  ],
  ticketsByModule: [
    { label: "Incident", count: 92 },
    { label: "Service Request", count: 61 },
    { label: "Change", count: 33 },
  ],
  slaPerformance: [
    { weekStart: "2026-08-03", label: "Aug 3", met: 6, breached: 3 },
    { weekStart: "2026-08-10", label: "Aug 10", met: 7, breached: 2 },
    { weekStart: "2026-08-17", label: "Aug 17", met: 8, breached: 1 },
    { weekStart: "2026-08-24", label: "Aug 24", met: 6, breached: 3 },
    { weekStart: "2026-08-31", label: "Aug 31", met: 7, breached: 2 },
    { weekStart: "2026-09-07", label: "Sep 7", met: 8, breached: 1 },
    { weekStart: "2026-09-14", label: "Sep 14", met: 7, breached: 2 },
    { weekStart: "2026-09-21", label: "Sep 21", met: 9, breached: 1 },
  ],
};

export const mockAuditLogs: AuditLog[] = [
  {
    id: "aud-001",
    actorId: null,
    actor: "Ian Okonkwo",
    actorRole: "Admin",
    action: "PATCH /assets/:id",
    entityType: "assets",
    entityId: "HW-1042",
    diff: {
      request: { status: "InRepair" },
      response: { id: "HW-1042", status: "InRepair" },
    },
    createdAt: "2026-09-24T09:12:00Z",
  },
  {
    id: "aud-002",
    actorId: null,
    actor: "Alice Chen",
    actorRole: "Agent",
    action: "PATCH /incidents/:id",
    entityType: "incidents",
    entityId: "INC-441",
    diff: {
      request: { assignedTo: "agent-1" },
      response: { id: "INC-441", status: "Assigned" },
    },
    createdAt: "2026-09-24T11:40:00Z",
  },
  {
    id: "aud-003",
    actorId: null,
    actor: "System",
    actorRole: null,
    action: "POST /incidents/:id/comments -> 409",
    entityType: "incidents",
    entityId: "INC-438",
    diff: { outcome: "failed", status: 409 },
    createdAt: "2026-09-25T02:05:00Z",
  },
  {
    id: "aud-004",
    actorId: null,
    actor: "Ian Okonkwo",
    actorRole: "Admin",
    action: "POST /assets",
    entityType: "assets",
    entityId: "NW-3012",
    diff: {
      request: { assetTag: "NW-3012", name: "Core switch" },
      response: { id: "NW-3012", status: "Active" },
    },
    createdAt: "2026-09-25T08:18:00Z",
  },
];

export const mockVolumeByModule = {
  range: "30d" as const,
  from: "2026-08-30T00:00:00.000Z",
  to: "2026-09-29T00:00:00.000Z",
  data: [
    { module: "Incident", open: 18, closed: 74, total: 92 },
    { module: "Service Request", open: 12, closed: 49, total: 61 },
    { module: "Change", open: 6, closed: 27, total: 33 },
  ],
};

export const mockStatusDistribution = {
  range: "30d" as const,
  from: "2026-08-30T00:00:00.000Z",
  to: "2026-09-29T00:00:00.000Z",
  data: [
    { status: "Incident:New", module: "Incident", label: "New", count: 18 },
    { status: "Incident:InProgress", module: "Incident", label: "InProgress", count: 29 },
    { status: "Incident:Resolved", module: "Incident", label: "Resolved", count: 45 },
    { status: "ServiceRequest:Submitted", module: "Service Request", label: "Submitted", count: 14 },
    { status: "Change:Scheduled", module: "Change", label: "Scheduled", count: 8 },
  ],
};

export const mockSlaCompliance = {
  range: "30d" as const,
  from: "2026-08-30T00:00:00.000Z",
  to: "2026-09-29T00:00:00.000Z",
  met: 84,
  breached: 6,
  rate: 93.3,
};

export const mockQueueHealth = {
  alert: true,
  queues: [
    {
      name: "sla-queue",
      counts: {
        active: 0,
        waiting: 1,
        completed: 120,
        failed: 2,
        delayed: 0,
        paused: 0,
        stalled: 1,
      },
      paused: false,
      alert: true,
      error: null,
    },
    {
      name: "ticket-lifecycle-queue",
      counts: {
        active: 1,
        waiting: 0,
        completed: 44,
        failed: 0,
        delayed: 0,
        paused: 0,
        stalled: 0,
      },
      paused: false,
      alert: false,
      error: null,
    },
    {
      name: "email-queue",
      counts: {
        active: 0,
        waiting: 3,
        completed: 88,
        failed: 1,
        delayed: 0,
        paused: 0,
        stalled: 0,
      },
      paused: false,
      alert: true,
      error: null,
    },
  ],
};

/** Mutable DEV stores — Admin authoring mutates until Dev D APIs land. */
export const mockKnowledgeCategories: KnowledgeCategory[] = [
  {
    id: "kc-001",
    name: "Getting started",
    slug: "getting-started",
    description: "Onboarding and first-day tips",
    createdAt: "2026-09-01T10:00:00Z",
    updatedAt: "2026-09-01T10:00:00Z",
  },
  {
    id: "kc-002",
    name: "Network",
    slug: "network",
    description: "VPN, Wi-Fi, and connectivity",
    createdAt: "2026-09-01T10:00:00Z",
    updatedAt: "2026-09-01T10:00:00Z",
  },
  {
    id: "kc-003",
    name: "Hardware",
    slug: "hardware",
    description: "Laptops, peripherals, printers",
    createdAt: "2026-09-01T10:00:00Z",
    updatedAt: "2026-09-01T10:00:00Z",
  },
];

export const mockKnowledgeArticles: KnowledgeArticle[] = [
  {
    id: "ka-001",
    title: "How to reset your password",
    slug: "how-to-reset-your-password",
    body: "## Reset password\n\n1. Go to the login page\n2. Click **Forgot password**\n3. Check your email for a reset link\n\nIf you do not receive mail within 10 minutes, contact the service desk.",
    status: "Published",
    categoryId: "kc-001",
    authorId: "admin-1",
    createdAt: "2026-09-10T10:00:00Z",
    updatedAt: "2026-09-20T10:00:00Z",
  },
  {
    id: "ka-002",
    title: "Connect to corporate VPN",
    slug: "connect-to-corporate-vpn",
    body: "## VPN setup\n\nInstall the company VPN client, then sign in with your work account.\n\n**Tips**\n- Use the office profile when on-site\n- Split tunneling is enabled for SaaS apps",
    status: "Published",
    categoryId: "kc-002",
    authorId: "admin-1",
    createdAt: "2026-09-12T10:00:00Z",
    updatedAt: "2026-09-22T10:00:00Z",
  },
  {
    id: "ka-003",
    title: "Request a replacement laptop (draft)",
    slug: "request-a-replacement-laptop",
    body: "Draft notes for hardware refresh policy.\n\n- Eligibility after 36 months\n- Backup checklist before swap",
    status: "Draft",
    categoryId: "kc-003",
    authorId: "admin-1",
    createdAt: "2026-09-25T10:00:00Z",
    updatedAt: "2026-09-25T10:00:00Z",
  },
];

/** Matches apps/server seed defaults for sla_rules. */
export const mockSlaRules: SlaRule[] = [
  {
    id: "sla-p1",
    priority: "P1",
    responseMinutes: 15,
    resolveMinutes: 240,
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "sla-p2",
    priority: "P2",
    responseMinutes: 60,
    resolveMinutes: 480,
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "sla-p3",
    priority: "P3",
    responseMinutes: 240,
    resolveMinutes: 1440,
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "sla-p4",
    priority: "P4",
    responseMinutes: 480,
    resolveMinutes: 4320,
    createdAt: "2026-01-01T00:00:00Z",
  },
];
