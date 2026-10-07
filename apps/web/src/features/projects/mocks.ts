import type { DirectoryUser, Project, ProjectMember, ProjectModule } from "./types";

export const mockProjects: Project[] = [
  {
    id: "proj-corporate-it",
    name: "Corporate IT",
    managerId: "user-manager",
    createdAt: new Date().toISOString(),
  },
];

export const mockProjectMembers: ProjectMember[] = [
  {
    userId: "user-agent",
    name: "Support Agent",
    email: "agent@sadhox.local",
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

export const mockDirectoryUsers: DirectoryUser[] = [
  {
    id: "user-agent",
    name: "Support Agent",
    email: "agent@sadhox.local",
    role: "Agent",
  },
  {
    id: "user-manager",
    name: "Morgan Manager",
    email: "manager@sadhox.local",
    role: "Manager",
  },
];
