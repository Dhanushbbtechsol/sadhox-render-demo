import type { Incident, Problem } from "@/types/itsm";

/** Local fixtures for Storybook / offline demos only — live hooks use the Nest API. */
export const MOCK_INCIDENTS: Incident[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    title: "VPN connection drops every 10 minutes",
    description: "Remote staff cannot stay connected to the corporate VPN.",
    category: "Network & Connectivity",
    subcategory: "VPN Access",
    impact: "High",
    urgency: "High",
    priority: "P1",
    status: "InProgress",
    assignedTo: null,
    reporterId: "user-end-1",
    slaDueAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    resolvedAt: null,
    closedAt: null,
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const MOCK_PROBLEMS: Problem[] = [
  {
    id: "00000000-0000-4000-8000-000000000101",
    title: "Recurring VPN disconnects on Split-Tunnel profile",
    description: "Multiple incidents point to unstable split-tunnel routes.",
    rootCause: "Misconfigured route metric on gateway cluster B.",
    knownError: true,
    status: "KnownError",
    assignedTo: null,
    linkedIncidentIds: ["00000000-0000-4000-8000-000000000001"],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
