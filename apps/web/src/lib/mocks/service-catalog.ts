import type {
  ChangeRecord,
  ServiceCatalogItem,
  ServiceRequest,
} from "@/types/api";

export const MOCK_CATALOG: ServiceCatalogItem[] = [
  {
    id: "cat-laptop",
    name: "Request Laptop",
    description: "Request a new developer or standard business laptop.",
    department: "IT Hardware",
    subcategory: "Laptop request",
    formFields: [
      {
        name: "justification",
        label: "Justification",
        type: "textarea",
        required: true,
      },
      {
        name: "urgency",
        label: "Urgency",
        type: "select",
        required: true,
        options: ["Low", "Medium", "High"],
      },
      {
        name: "laptopType",
        label: "Laptop type",
        type: "select",
        required: true,
        options: ["Standard", "Developer", "Executive"],
      },
    ],
  },
  {
    id: "cat-vpn",
    name: "VPN Access",
    description: "Request remote VPN access for secure network connectivity.",
    department: "Access",
    subcategory: "VPN Access",
    formFields: [
      {
        name: "justification",
        label: "Justification",
        type: "textarea",
        required: true,
      },
      {
        name: "urgency",
        label: "Urgency",
        type: "select",
        required: true,
        options: ["Low", "Medium", "High"],
      },
      {
        name: "duration",
        label: "Access duration",
        type: "select",
        required: true,
        options: ["30 days", "90 days", "1 year"],
      },
    ],
  },
  {
    id: "cat-database",
    name: "Database Access",
    description: "Request read or write access to a production database.",
    department: "Data",
    subcategory: "Database access",
    formFields: [
      {
        name: "justification",
        label: "Justification",
        type: "textarea",
        required: true,
      },
      {
        name: "urgency",
        label: "Urgency",
        type: "select",
        required: true,
        options: ["Low", "Medium", "High"],
      },
      {
        name: "databaseName",
        label: "Database name",
        type: "text",
        required: true,
      },
      {
        name: "accessLevel",
        label: "Access level",
        type: "select",
        required: true,
        options: ["Read", "Write", "Admin"],
      },
    ],
  },
  {
    id: "cat-monitor",
    name: "External Monitor",
    description: "Request an additional external display for your workstation.",
    department: "IT Hardware",
    subcategory: "Monitor/Peripherals",
    formFields: [
      {
        name: "justification",
        label: "Justification",
        type: "textarea",
        required: true,
      },
      {
        name: "urgency",
        label: "Urgency",
        type: "select",
        required: true,
        options: ["Low", "Medium", "High"],
      },
      {
        name: "size",
        label: "Preferred size",
        type: "select",
        required: true,
        options: ["24 inch", "27 inch", "32 inch"],
      },
    ],
  },
  {
    id: "cat-software",
    name: "Software License",
    description: "Request a licensed software package for your role.",
    department: "Access",
    subcategory: "Software license",
    formFields: [
      {
        name: "justification",
        label: "Justification",
        type: "textarea",
        required: true,
      },
      {
        name: "urgency",
        label: "Urgency",
        type: "select",
        required: true,
        options: ["Low", "Medium", "High"],
      },
      {
        name: "softwareName",
        label: "Software name",
        type: "text",
        required: true,
      },
    ],
  },
];

export let mockServiceRequests: ServiceRequest[] = [
  {
    id: "sr-1001",
    catalogId: "cat-vpn",
    catalogName: "VPN Access",
    requesterId: "user-enduser",
    requesterName: "End User",
    status: "Submitted",
    justification: "Need remote access while traveling.",
    urgency: "Medium",
    fields: { duration: "90 days" },
    createdAt: "2026-09-20T10:00:00.000Z",
    // No project → Admin-only step
    projectId: null,
    projectName: null,
  },
  {
    id: "sr-1003",
    catalogId: "cat-laptop",
    catalogName: "Request Laptop",
    requesterId: "user-enduser",
    requesterName: "End User",
    status: "Submitted",
    justification: "Replacement for onboarding on Alpha project.",
    urgency: "High",
    fields: { laptopType: "Developer" },
    createdAt: "2026-09-21T09:00:00.000Z",
    // Owned project → Manager step first
    projectId: "proj-alpha",
    projectName: "Alpha",
  },
  {
    id: "sr-1004",
    catalogId: "cat-software",
    catalogName: "Software License",
    requesterId: "user-enduser",
    requesterName: "End User",
    status: "PendingApproval",
    justification: "Manager OK — waiting on Admin.",
    urgency: "Medium",
    fields: { softwareName: "Figma" },
    createdAt: "2026-09-19T11:00:00.000Z",
    projectId: "proj-alpha",
    projectName: "Alpha",
  },
  {
    id: "sr-1002",
    catalogId: "cat-laptop",
    catalogName: "Request Laptop",
    requesterId: "user-enduser",
    requesterName: "End User",
    status: "Approved",
    justification: "Current laptop battery fails within 1 hour.",
    urgency: "High",
    fields: { laptopType: "Developer" },
    createdAt: "2026-09-18T14:30:00.000Z",
    approverId: "user-admin",
    approvedAt: "2026-09-19T09:00:00.000Z",
  },
];

export let mockChanges: ChangeRecord[] = [
  {
    id: "chg-2001",
    title: "Core switch firmware upgrade",
    description: "Upgrade edge switch firmware during maintenance window.",
    type: "Normal",
    status: "Submitted",
    scheduledStart: "2026-09-28T02:00:00.000Z",
    scheduledEnd: "2026-09-28T04:00:00.000Z",
    rollbackPlan: "Re-image previous firmware from golden image and restore configs.",
    createdById: "user-agent",
    createdByName: "Support Agent",
    createdAt: "2026-09-22T11:00:00.000Z",
    projectId: "proj-alpha",
    projectName: "Alpha",
  },
  {
    id: "chg-2003",
    title: "Shared printer firmware (no project)",
    description: "Admin-only approval path — no project manager.",
    type: "Standard",
    status: "Submitted",
    scheduledStart: "2026-09-29T01:00:00.000Z",
    scheduledEnd: "2026-09-29T02:00:00.000Z",
    rollbackPlan: "Revert firmware package.",
    createdById: "user-agent",
    createdByName: "Support Agent",
    createdAt: "2026-09-23T10:00:00.000Z",
    projectId: null,
    projectName: null,
  },
  {
    id: "chg-2004",
    title: "VPC peering change",
    description: "Manager already approved — waiting on Admin.",
    type: "Normal",
    status: "PendingApproval",
    scheduledStart: "2026-09-30T02:00:00.000Z",
    scheduledEnd: "2026-09-30T03:00:00.000Z",
    rollbackPlan: "Remove peering and restore route tables.",
    createdById: "user-agent",
    createdByName: "Support Agent",
    createdAt: "2026-09-25T08:00:00.000Z",
    projectId: "proj-alpha",
    projectName: "Alpha",
  },
  {
    id: "chg-2002",
    title: "Emergency firewall rule for partner API",
    description: "Open temporary inbound route for partner integration outage.",
    type: "Emergency",
    status: "Approved",
    scheduledStart: "2026-09-24T16:00:00.000Z",
    scheduledEnd: "2026-09-24T18:00:00.000Z",
    rollbackPlan: "Remove temporary allow rule and restore prior ACL snapshot.",
    createdById: "user-agent",
    createdByName: "Support Agent",
    approvedById: "user-admin",
    createdAt: "2026-09-24T15:20:00.000Z",
  },
];

export function addMockServiceRequest(request: ServiceRequest) {
  mockServiceRequests = [request, ...mockServiceRequests];
  return request;
}

export function updateMockChangeStatus(id: string, status: ChangeRecord["status"], approverId?: string) {
  mockChanges = mockChanges.map((change) =>
    change.id === id
      ? {
          ...change,
          status,
          approvedById: status === "Approved" ? approverId : change.approvedById,
        }
      : change,
  );
  return mockChanges.find((change) => change.id === id);
}
