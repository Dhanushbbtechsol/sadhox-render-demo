/** Contract types aligned with Nest incident/problem API. */

export type UserRole = "Admin" | "Agent" | "EndUser" | "Manager";

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
  referenceCode?: string | null;
  title: string;
  description: string;
  category: string;
  subcategory?: string | null;
  impact: Impact;
  urgency: Urgency;
  priority: Priority;
  status: IncidentStatus;
  assignedTo: string | null;
  assigneeName?: string | null;
  reporterId: string;
  reporterName?: string | null;
  projectId?: string | null;
  moduleId?: string | null;
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
  /** Present on incident detail when linked via problem_incidents. */
  linkedProblem?: {
    id: string;
    referenceCode?: string | null;
    title: string;
    status: string;
    knownError: boolean;
  } | null;
}

export interface Project {
  id: string;
  name: string;
  managerId: string;
  managerName: string | null;
  createdAt: string;
}

export interface ProjectModule {
  id: string;
  projectId: string;
  name: string;
  createdAt: string;
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
  subcategory: string;
  impact: Impact;
  urgency: Urgency;
  projectId?: string | null;
  moduleId?: string | null;
  assignedTo?: string | null;
}

export interface UpdateIncidentInput {
  title?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  impact?: Impact;
  urgency?: Urgency;
  status?: IncidentStatus;
  assignedTo?: string | null;
  resolutionNotes?: string;
  projectId?: string | null;
  moduleId?: string | null;
}

export interface LinkedIncidentSnippet {
  id: string;
  referenceCode?: string | null;
  title: string;
  status: string;
  priority: string;
}

export interface Problem {
  id: string;
  referenceCode?: string | null;
  title: string;
  description: string;
  rootCause: string | null;
  knownError: boolean;
  status: ProblemStatus;
  assignedTo: string | null;
  assigneeName?: string | null;
  projectId?: string | null;
  moduleId?: string | null;
  linkedIncidentIds: string[];
  linkedIncidents?: LinkedIncidentSnippet[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateProblemInput {
  title: string;
  description: string;
  rootCause?: string;
  knownError?: boolean;
  projectId?: string | null;
  moduleId?: string | null;
  linkedIncidentIds?: string[];
}

export type TicketType = "incident" | "problem" | "service_request" | "change";

export interface TicketComment {
  id: string;
  ticketId: string;
  ticketType: TicketType;
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

export {
  INCIDENT_CATEGORIES,
  INCIDENT_CATEGORY_MAP,
  subcategoriesFor,
  type IncidentCategory,
} from "./incident-categories";
