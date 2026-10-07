import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type { Project, ProjectModule } from "@/types/api";

const projectsKey = ["projects"] as const;

export function useProjects() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: [...projectsKey, userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const result = await apiFetch<{ data: Project[] }>("/projects");
      return result.data;
    },
  });
}

export function useProjectModules(projectId: string | undefined) {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: [...projectsKey, "modules", projectId, userId],
    enabled: Boolean(userId) && Boolean(projectId),
    queryFn: async () => {
      const result = await apiFetch<{ data: ProjectModule[] }>(
        `/projects/${projectId}/modules`,
      );
      return result.data;
    },
  });
}
