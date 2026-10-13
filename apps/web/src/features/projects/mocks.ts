import type { DirectoryUser, Project, ProjectMember, ProjectModule } from "./types";

export const mockProjects: Project[] = [
  {
    id: "proj-corporate-it",
    referenceCode: "PRJ-000001",
    name: "Corporate IT",
    managerId: "user-manager",
    managerName: "Morgan Manager",
    createdAt: new Date().toISOString(),
  },
  {
    id: "proj-field-ops",
    referenceCode: "PRJ-000002",
    name: "Field Ops",
    managerId: "user-manager-2",
    managerName: "Casey Manager",
    createdAt: new Date().toISOString(),
  },
];

export const mockProjectMembers: ProjectMember[] = [
  {
    userId: "user-agent",
    name: "Support Agent",
    email: "agent@offline.local",
    role: "Agent",
    createdAt: new Date().toISOString(),
  },
];

export const mockProjectModules: ProjectModule[] = [
  {
    id: "mod-networking",
    projectId: "proj-corporate-it",
    name: "Networking",
    createdAt: new Date().toISOString(),
  },
];

/** Offline DEV fixtures — emails must not match production seed addresses. */
export const mockDirectoryUsers: DirectoryUser[] = [
  {
    id: "user-admin",
    referenceCode: "USR-000001",
    name: "Ian Admin",
    email: "admin@offline.local",
    role: "Admin",
  },
  {
    id: "user-agent",
    referenceCode: "USR-000002",
    name: "Support Agent",
    email: "agent@offline.local",
    role: "Agent",
  },
  {
    id: "user-enduser",
    referenceCode: "USR-000003",
    name: "End User",
    email: "enduser@offline.local",
    role: "EndUser",
  },
  {
    id: "user-portal",
    referenceCode: "USR-000004",
    name: "Pat Portal",
    email: "user@offline.local",
    role: "EndUser",
  },
  {
    id: "user-manager",
    referenceCode: "USR-000005",
    name: "Morgan Manager",
    email: "manager@offline.local",
    role: "Manager",
  },
  {
    id: "user-manager-2",
    referenceCode: "USR-000006",
    name: "Casey Manager",
    email: "manager2@offline.local",
    role: "Manager",
  },
];
