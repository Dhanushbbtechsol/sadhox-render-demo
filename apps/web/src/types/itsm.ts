/** Contract types mirroring Dev D OpenAPI until codegen is available. */

export type UserRole = "Admin" | "Agent" | "EndUser";

export type Impact = "Low" | "Medium" | "High";
export type Urgency = "Low" | "Medium" | "High";
export type Priority = "P1" | "P2" | "P3" | "P4";

export type IncidentStatus =
  | "New"
  | "Assigned"
  | "In Progress"
  | "Resolved"
  | "Closed";

export type ProblemStatus =
  | "Open"
  | "Under Investigation"
  | "Workaround Found"
  | "Resolved";

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
  reporterId: string;
  slaDueAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIncidentInput {
  title: string;
  description: string;
  category: string;
  impact: Impact;
  urgency: Urgency;
}

export interface Problem {
  id: string;
  title: string;
  description: string;
  rootCause: string | null;
  knownError: boolean;
  status: ProblemStatus;
  assignedTo: string | null;
  linkedIncidentIds: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Priority matrix (Impact × Urgency):
 * High×High = P1; High×Med / Med×High = P2;
 * Med×Med / Low×High / High×Low = P3; else = P4
 */
export function calculatePriority(impact: Impact, urgency: Urgency): Priority {
  const score: Record<Impact | Urgency, number> = {
    Low: 1,
    Medium: 2,
    High: 3,
  };

  const product = score[impact] * score[urgency];

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
    (impact === "High" && urgency === "Low") ||
    product >= 4
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

export const INCIDENT_CATEGORIES = [
  "Hardware",
  "Software",
  "Network",
  "Access",
  "Email",
  "Other",
] as const;
