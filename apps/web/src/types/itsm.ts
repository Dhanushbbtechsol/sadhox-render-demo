/** Contract types aligned with Nest incident/problem API. */

export type UserRole = "Admin" | "Agent" | "EndUser";

export type Impact = "Low" | "Medium" | "High";
export type Urgency = "Low" | "Medium" | "High";
export type Priority = "P1" | "P2" | "P3" | "P4";

export type IncidentStatus =
  | "New"
  | "Assigned"
  | "InProgress"
  | "Resolved"
  | "Closed";

export type ProblemStatus =
  | "Open"
  | "Investigating"
  | "KnownError"
  | "Resolved"
  | "Closed";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  category: string;
  impact: Impact;
  urgency: Urgency;
  priority: Priority;
  status: IncidentStatus;
  assignedTo: string | null;
  assigneeName?: string | null;
  reporterId: string;
  reporterName?: string | null;
  slaDueAt: string | null;
  slaBreached?: boolean;
  resolutionNotes?: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  reporter?: { id: string; name: string; email: string } | null;
  assignee?: { id: string; name: string; email: string } | null;
  slaTargetMinutes?: number | null;
}

export interface AgentSnippet {
  id: string;
  name: string;
  email: string;
  openTicketCount: number;
}

export interface CreateIncidentInput {
  title: string;
  description: string;
  category: string;
  impact: Impact;
  urgency: Urgency;
}

export interface UpdateIncidentInput {
  title?: string;
  description?: string;
  category?: string;
  impact?: Impact;
  urgency?: Urgency;
  status?: IncidentStatus;
  assignedTo?: string | null;
  resolutionNotes?: string;
}

export interface LinkedIncidentSnippet {
  id: string;
  title: string;
  status: string;
  priority: string;
}

export interface Problem {
  id: string;
  title: string;
  description: string;
  rootCause: string | null;
  knownError: boolean;
  status: ProblemStatus;
  assignedTo: string | null;
  assigneeName?: string | null;
  linkedIncidentIds: string[];
  linkedIncidents?: LinkedIncidentSnippet[];
  createdAt: string;
  updatedAt: string;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  ticketType: "incident";
  authorId: string;
  authorName: string | null;
  content: string;
  createdAt: string;
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/**
 * Priority matrix (Impact × Urgency):
 * High×High = P1; High×Med / Med×High = P2;
 * Med×Med / Low×High / High×Low = P3; else = P4
 */
export function calculatePriority(impact: Impact, urgency: Urgency): Priority {
  if (impact === "High" && urgency === "High") return "P1";
  if (
    (impact === "High" && urgency === "Medium") ||
    (impact === "Medium" && urgency === "High")
  ) {
    return "P2";
  }
  if (
    (impact === "Medium" && urgency === "Medium") ||
    (impact === "Low" && urgency === "High") ||
    (impact === "High" && urgency === "Low")
  ) {
    return "P3";
  }
  return "P4";
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  P1: "Critical",
  P2: "High",
  P3: "Medium",
  P4: "Low",
};

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  New: "New",
  Assigned: "Assigned",
  InProgress: "In Progress",
  Resolved: "Resolved",
  Closed: "Closed",
};

export const PROBLEM_STATUS_LABELS: Record<ProblemStatus, string> = {
  Open: "Open",
  Investigating: "Under Investigation",
  KnownError: "Workaround Found",
  Resolved: "Resolved",
  Closed: "Closed",
};

export const INCIDENT_CATEGORIES = [
  "Hardware",
  "Software",
  "Network",
  "Access",
  "Email",
  "Other",
] as const;
