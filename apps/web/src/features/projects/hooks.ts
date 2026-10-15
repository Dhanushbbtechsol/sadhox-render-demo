import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch, getAccessToken, isMockAccessToken } from "@/lib/api";

import {
  mockDirectoryUsers,
  mockProjectMembers,
  mockProjectModules,
  mockProjects,
} from "./mocks";
import type {
  CreateProjectInput,
  DirectoryUser,
  Project,
  ProjectMember,
  ProjectModule,
  SaveProjectSummaryInput,
} from "./types";

function useOfflineAdminData() {
  return import.meta.env.DEV && isMockAccessToken(getAccessToken());
}

/** Nest list endpoints use `{ data }`; tolerate a bare array from older servers. */
function unwrapList<T>(result: { data: T[] } | T[] | null | undefined): T[] {
  if (Array.isArray(result)) return result;
  return result?.data ?? [];
}

export function useProjects() {
  return useQuery({
    queryKey: ["projects", useOfflineAdminData() ? "mock" : "live"],
    queryFn: async (): Promise<Project[]> => {
      if (useOfflineAdminData()) return [...mockProjects];
      const result = await apiFetch<{ data: Project[] } | Project[]>(
        "/projects",
      );
      return unwrapList(result);
    },
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ["projects", id, useOfflineAdminData() ? "mock" : "live"],
    enabled: Boolean(id),
    queryFn: async (): Promise<Project> => {
      if (!id) throw new Error("Missing project id");
      if (useOfflineAdminData()) {
        const found = mockProjects.find((p) => p.id === id);
        if (!found) throw new Error("Project not found");
        return found;
      }
      return await apiFetch<Project>(`/projects/${id}`);
    },
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      if (useOfflineAdminData()) {
        const managerName =
          mockDirectoryUsers.find((u) => u.id === input.managerId)?.name ??
          null;
        const created: Project = {
          id: `proj-${Date.now()}`,
          referenceCode: `PRJ-${String(mockProjects.length + 1).padStart(6, "0")}`,
          name: input.name,
          managerId: input.managerId,
          managerName,
          createdAt: new Date().toISOString(),
        };
        mockProjects.push(created);
        return created;
      }
      return await apiFetch<Project>("/projects", {
        method: "POST",
        body: input,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

/**
 * U8 — one save for the project summary dialog. A single submit persists
 * the name, the manager, the member changes, and the module changes
 * together (server: `PATCH /projects/:id/summary`, one transaction).
 */
export function useSaveProjectSummary(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveProjectSummaryInput) => {
      if (useOfflineAdminData()) {
        const index = mockProjects.findIndex((p) => p.id === projectId);
        if (index < 0) throw new Error("Project not found");
        const managerName =
          mockDirectoryUsers.find((u) => u.id === input.managerId)?.name ??
          null;
        mockProjects[index] = {
          ...mockProjects[index],
          name: input.name,
          managerId: input.managerId,
          managerName,
        };

        const memberIds = new Set(input.memberUserIds);
        for (let i = mockProjectMembers.length - 1; i >= 0; i -= 1) {
          if (!memberIds.has(mockProjectMembers[i].userId)) {
            mockProjectMembers.splice(i, 1);
          }
        }
        for (const userId of input.memberUserIds) {
          if (!mockProjectMembers.some((m) => m.userId === userId)) {
            const user = mockDirectoryUsers.find((u) => u.id === userId);
            if (!user) throw new Error("User not found");
            mockProjectMembers.push({
              userId: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              createdAt: new Date().toISOString(),
            });
          }
        }

        const desiredModuleIds = new Set(
          input.modules.filter((m) => m.id).map((m) => m.id as string),
        );
        for (let i = mockProjectModules.length - 1; i >= 0; i -= 1) {
          const mod = mockProjectModules[i];
          if (mod.projectId === projectId && !desiredModuleIds.has(mod.id)) {
            mockProjectModules.splice(i, 1);
          }
        }
        for (const mod of input.modules) {
          if (mod.id) {
            const existing = mockProjectModules.find((m) => m.id === mod.id);
            if (existing) existing.name = mod.name;
          } else {
            mockProjectModules.push({
              id: `mod-${Date.now()}-${Math.random()}`,
              projectId,
              name: mod.name,
              createdAt: new Date().toISOString(),
            });
          }
        }

        return {
          project: mockProjects[index],
          members: mockProjectMembers,
          modules: mockProjectModules.filter((m) => m.projectId === projectId),
        };
      }
      return await apiFetch<{
        project: Project;
        members: ProjectMember[];
        modules: ProjectModule[];
      }>(`/projects/${projectId}/summary`, {
        method: "PATCH",
        body: input,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      await queryClient.invalidateQueries({ queryKey: ["projects", projectId] });
      await queryClient.invalidateQueries({
        queryKey: ["projects", projectId, "members"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["projects", projectId, "modules"],
      });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (useOfflineAdminData()) {
        const index = mockProjects.findIndex((p) => p.id === id);
        if (index < 0) throw new Error("Project not found");
        mockProjects.splice(index, 1);
        return { id };
      }
      await apiFetch(`/projects/${id}`, { method: "DELETE" });
      return { id };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useAddProjectMember(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      if (useOfflineAdminData()) {
        const user = mockDirectoryUsers.find((u) => u.id === userId);
        if (!user) throw new Error("User not found");
        if (!mockProjectMembers.some((m) => m.userId === userId)) {
          mockProjectMembers.push({
            userId: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: new Date().toISOString(),
          });
        }
        return mockProjectMembers.find((m) => m.userId === userId)!;
      }
      return await apiFetch<ProjectMember>(`/projects/${projectId}/members`, {
        method: "POST",
        body: { userId },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["projects", projectId, "members"],
      });
    },
  });
}

export function useRemoveProjectMember(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      if (useOfflineAdminData()) {
        const index = mockProjectMembers.findIndex((m) => m.userId === userId);
        if (index >= 0) mockProjectMembers.splice(index, 1);
        return { userId };
      }
      await apiFetch(`/projects/${projectId}/members/${userId}`, {
        method: "DELETE",
      });
      return { userId };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["projects", projectId, "members"],
      });
    },
  });
}

export function useCreateProjectModule(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      if (useOfflineAdminData()) {
        const created: ProjectModule = {
          id: `mod-${Date.now()}`,
          projectId,
          name,
          createdAt: new Date().toISOString(),
        };
        mockProjectModules.push(created);
        return created;
      }
      return await apiFetch<ProjectModule>(`/projects/${projectId}/modules`, {
        method: "POST",
        body: { name },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["projects", projectId, "modules"],
      });
    },
  });
}

export function useUpdateProjectModule(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      if (useOfflineAdminData()) {
        const index = mockProjectModules.findIndex((m) => m.id === id);
        if (index < 0) throw new Error("Module not found");
        mockProjectModules[index] = { ...mockProjectModules[index], name };
        return mockProjectModules[index];
      }
      return await apiFetch<ProjectModule>(
        `/projects/${projectId}/modules/${id}`,
        { method: "PATCH", body: { name } },
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["projects", projectId, "modules"],
      });
    },
  });
}

export function useDeleteProjectModule(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (useOfflineAdminData()) {
        const index = mockProjectModules.findIndex((m) => m.id === id);
        if (index >= 0) mockProjectModules.splice(index, 1);
        return { id };
      }
      await apiFetch(`/projects/${projectId}/modules/${id}`, {
        method: "DELETE",
      });
      return { id };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["projects", projectId, "modules"],
      });
    },
  });
}

export function useProjectMembers(projectId: string | undefined) {
  return useQuery({
    queryKey: [
      "projects",
      projectId,
      "members",
      useOfflineAdminData() ? "mock" : "live",
    ],
    enabled: Boolean(projectId),
    queryFn: async (): Promise<ProjectMember[]> => {
      if (!projectId) return [];
      if (useOfflineAdminData()) return [...mockProjectMembers];
      const result = await apiFetch<
        { data: ProjectMember[] } | ProjectMember[]
      >(`/projects/${projectId}/members`);
      return unwrapList(result);
    },
  });
}

export function useProjectModules(projectId: string | undefined) {
  return useQuery({
    queryKey: [
      "projects",
      projectId,
      "modules",
      useOfflineAdminData() ? "mock" : "live",
    ],
    enabled: Boolean(projectId),
    queryFn: async (): Promise<ProjectModule[]> => {
      if (!projectId) return [];
      if (useOfflineAdminData()) {
        return mockProjectModules.filter((m) => m.projectId === projectId);
      }
      const result = await apiFetch<
        { data: ProjectModule[] } | ProjectModule[]
      >(`/projects/${projectId}/modules`);
      return unwrapList(result);
    },
  });
}

export function useDirectoryUsers(role?: "Agent" | "Manager" | "Admin" | "EndUser") {
  return useQuery({
    queryKey: [
      "admin",
      "users",
      role ?? "all",
      useOfflineAdminData() ? "mock" : "live",
    ],
    queryFn: async (): Promise<DirectoryUser[]> => {
      if (useOfflineAdminData()) {
        return role
          ? mockDirectoryUsers.filter((u) => u.role === role)
          : [...mockDirectoryUsers];
      }
      const query = role ? `?role=${role}` : "";
      const result = await apiFetch<
        { data: DirectoryUser[] } | DirectoryUser[]
      >(`/admin/users${query}`);
      return unwrapList(result);
    },
  });
}

export type ManagerDashboardStats = {
  kpis: {
    id: string;
    label: string;
    value: string;
    delta: string;
    trend: "up" | "down" | "flat";
  }[];
  projectIds: string[];
};

export function useManagerDashboardStats() {
  return useQuery({
    queryKey: [
      "manager",
      "dashboard",
      "stats",
      useOfflineAdminData() ? "mock" : "live",
    ],
    queryFn: async (): Promise<ManagerDashboardStats> => {
      if (useOfflineAdminData()) {
        return {
          kpis: [
            {
              id: "projects",
              label: "Owned projects",
              value: String(mockProjects.length),
              delta: "Assigned to you",
              trend: "flat",
            },
            {
              id: "total",
              label: "Total tickets",
              value: "0",
              delta: "In owned projects",
              trend: "flat",
            },
            {
              id: "open",
              label: "Open tickets",
              value: "0",
              delta: "Tickets + requests",
              trend: "flat",
            },
            {
              id: "p1",
              label: "P1 tickets",
              value: "0",
              delta: "Current P1 count",
              trend: "flat",
            },
          ],
          projectIds: mockProjects.map((p) => p.id),
        };
      }
      return await apiFetch<ManagerDashboardStats>("/manager/dashboard/stats");
    },
  });
}

export type ManagerCharts = {
  range: "7d" | "30d" | "quarter" | "ytd" | "year";
  volume: { module: string; open: number; closed: number }[];
  sla: { met: number; breached: number; rate: number };
  projectIds: string[];
};

export function useManagerCharts(
  range: "7d" | "30d" | "quarter" | "ytd" | "year",
) {
  return useQuery({
    queryKey: [
      "manager",
      "dashboard",
      "charts",
      range,
      useOfflineAdminData() ? "mock" : "live",
    ],
    queryFn: async (): Promise<ManagerCharts> => {
      if (useOfflineAdminData()) {
        return {
          range,
          projectIds: mockProjects.map((p) => p.id),
          volume: [
            { module: "Ticket", open: 0, closed: 0 },
            { module: "Request", open: 0, closed: 0 },
            { module: "Change request", open: 0, closed: 0 },
          ],
          sla: { met: 0, breached: 0, rate: 100 },
        };
      }
      return await apiFetch<ManagerCharts>(
        `/manager/dashboard/charts?range=${range}`,
      );
    },
  });
}
