import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type {
  AgentSnippet,
  CreateIncidentInput,
  CreateProblemInput,
  Incident,
  PageMeta,
  Problem,
  UpdateIncidentInput,
} from "@/types/itsm";

const incidentsKey = ["incidents"] as const;
const problemsKey = ["problems"] as const;
const agentsKey = ["assignment", "agents"] as const;

export type IncidentListParams = {
  page?: number;
  pageSize?: number;
  status?: string;
  priority?: string;
  projectId?: string;
  sortBy?: "createdAt" | "priority" | "status" | "slaDueAt";
  sortDir?: "asc" | "desc";
};

function toQuery(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function useIncidents(params: IncidentListParams = {}) {
  const userId = useAuthStore((state) => state.user?.id);
  const {
    page = 1,
    pageSize = 10,
    status,
    priority,
    projectId,
    sortBy = "createdAt",
    sortDir = "desc",
  } = params;

  return useQuery({
    queryKey: [...incidentsKey, userId, params],
    enabled: Boolean(userId),
    queryFn: async () => {
      const result = await apiFetch<{ data: Incident[]; meta: PageMeta }>(
        `/incidents${toQuery({
          page,
          pageSize,
          status,
          priority,
          projectId,
          sortBy,
          sortDir,
        })}`,
      );
      return result;
    },
  });
}

export function useIncident(id: string | undefined) {
  const userId = useAuthStore((state) => state.user?.id);

  return useQuery({
    queryKey: [...incidentsKey, id, userId],
    enabled: Boolean(id) && Boolean(userId),
    queryFn: () => apiFetch<Incident>(`/incidents/${id}`),
  });
}

export function useProblems(
  params: { page?: number; pageSize?: number; projectId?: string } = {},
) {
  const userId = useAuthStore((state) => state.user?.id);
  const { page = 1, pageSize = 10, projectId } = params;

  return useQuery({
    queryKey: [...problemsKey, userId, params],
    enabled: Boolean(userId),
    queryFn: async () => {
      const result = await apiFetch<{ data: Problem[]; meta: PageMeta }>(
        `/problems${toQuery({ page, pageSize, projectId })}`,
      );
      return result;
    },
  });
}

export function useProblem(id: string | undefined) {
  const userId = useAuthStore((state) => state.user?.id);

  return useQuery({
    queryKey: [...problemsKey, id, userId],
    enabled: Boolean(id) && Boolean(userId),
    queryFn: () => apiFetch<Problem>(`/problems/${id}`),
  });
}

export function useAgents(
  projectId?: string | null,
  options?: { enabled?: boolean },
) {
  const userId = useAuthStore((state) => state.user?.id);

  return useQuery({
    queryKey: [...agentsKey, userId, projectId ?? "global"],
    enabled: Boolean(userId) && (options?.enabled ?? true),
    queryFn: () =>
      apiFetch<AgentSnippet[]>(
        `/assignment/agents${toQuery({
          projectId: projectId ?? undefined,
        })}`,
      ),
  });
}

export function useCreateIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateIncidentInput) =>
      apiFetch<Incident>("/incidents", {
        method: "POST",
        body: input,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: incidentsKey });
    },
  });
}

export function useAssignIncident(incidentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (agentId: string) =>
      apiFetch<Incident>(`/incidents/${incidentId}/assign`, {
        method: "POST",
        body: { agentId },
      }),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: incidentsKey });
      void queryClient.invalidateQueries({ queryKey: agentsKey });
      queryClient.setQueryData(
        [...incidentsKey, incidentId, useAuthStore.getState().user?.id],
        data,
      );
    },
  });
}

export function useReopenIncident(incidentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiFetch<Incident>(`/incidents/${incidentId}/reopen`, {
        method: "POST",
      }),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: incidentsKey });
      queryClient.setQueryData(
        [...incidentsKey, incidentId, useAuthStore.getState().user?.id],
        data,
      );
    },
  });
}

export function useUpdateIncident(incidentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateIncidentInput) =>
      apiFetch<Incident>(`/incidents/${incidentId}`, {
        method: "PATCH",
        body: input,
      }),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: incidentsKey });
      queryClient.setQueryData(
        [...incidentsKey, incidentId, useAuthStore.getState().user?.id],
        data,
      );
    },
  });
}

export function useCreateProblem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProblemInput) =>
      apiFetch<Problem>("/problems", {
        method: "POST",
        body: input,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: problemsKey });
      void queryClient.invalidateQueries({ queryKey: incidentsKey });
    },
  });
}

export function useUpdateProblem(problemId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      linkedIncidentIds?: string[];
      knownError?: boolean;
      title?: string;
      description?: string;
      rootCause?: string | null;
      status?: string;
      projectId?: string | null;
      moduleId?: string | null;
    }) =>
      apiFetch<Problem>(`/problems/${problemId}`, {
        method: "PATCH",
        body: input,
      }),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: problemsKey });
      void queryClient.invalidateQueries({ queryKey: incidentsKey });
      queryClient.setQueryData(
        [...problemsKey, problemId, useAuthStore.getState().user?.id],
        data,
      );
    },
  });
}
