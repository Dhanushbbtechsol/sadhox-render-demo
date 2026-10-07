import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type { Project, ProjectModule } from "@/types/itsm";

const projectsKey = ["projects"] as const;

export function useProjects() {
  const userId = useAuthStore((state) => state.user?.id);
  const role = useAuthStore((state) => state.user?.role);
  const canList =
    role === "Admin" || role === "Agent" || role === "Manager";

  return useQuery({
    queryKey: [...projectsKey, userId],
    enabled: Boolean(userId) && canList,
    queryFn: () => apiFetch<Project[]>("/projects"),
  });
}

export function useProjectModules(projectId: string | undefined | null) {
  const userId = useAuthStore((state) => state.user?.id);

  return useQuery({
    queryKey: [...projectsKey, projectId, "modules", userId],
    enabled: Boolean(userId) && Boolean(projectId),
    queryFn: () =>
      apiFetch<ProjectModule[]>(`/projects/${projectId}/modules`),
  });
}
