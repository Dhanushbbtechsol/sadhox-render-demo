import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type { Project, ProjectModule } from "@/types/api";

const projectsKey = ["projects"] as const;

export function useProjects() {
  const userId = useAuthStore((state) => state.user?.id);

  return useQuery({
    queryKey: [...projectsKey, userId],
    enabled: Boolean(userId),
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
