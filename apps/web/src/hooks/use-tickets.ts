import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type {
  AgentSnippet,
  CreateIncidentInput,
  Incident,
  PageMeta,
  Problem,
  TicketComment,
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
    pageSize = 50,
    status,
    priority,
    sortBy = "createdAt",
    sortDir = "desc",
  } = params;

  return useQuery({
    queryKey: [...incidentsKey, userId, params],
    enabled: Boolean(userId),
    queryFn: async () => {
      const result = await apiFetch<{ data: Incident[]; meta: PageMeta }>(
        `/incidents${toQuery({ page, pageSize, status, priority, sortBy, sortDir })}`,
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

export function useIncidentComments(id: string | undefined) {
  const userId = useAuthStore((state) => state.user?.id);

  return useQuery({
    queryKey: [...incidentsKey, id, "comments", userId],
    enabled: Boolean(id) && Boolean(userId),
    queryFn: () => apiFetch<TicketComment[]>(`/incidents/${id}/comments`),
  });
}

export function useProblems(params: { page?: number; pageSize?: number } = {}) {
  const userId = useAuthStore((state) => state.user?.id);
  const { page = 1, pageSize = 50 } = params;

  return useQuery({
    queryKey: [...problemsKey, userId, params],
    enabled: Boolean(userId),
    queryFn: async () => {
      const result = await apiFetch<{ data: Problem[]; meta: PageMeta }>(
        `/problems${toQuery({ page, pageSize })}`,
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

export function useAgents() {
  const userId = useAuthStore((state) => state.user?.id);

  return useQuery({
    queryKey: [...agentsKey, userId],
    enabled: Boolean(userId),
    queryFn: () => apiFetch<AgentSnippet[]>("/assignment/agents"),
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
    mutationFn: (agentId?: string) =>
      apiFetch<Incident>(`/incidents/${incidentId}/assign`, {
        method: "POST",
        body: agentId ? { agentId } : {},
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
    }) =>
      apiFetch<Problem>(`/problems/${problemId}`, {
        method: "PATCH",
        body: input,
      }),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: problemsKey });
      queryClient.setQueryData(
        [...problemsKey, problemId, useAuthStore.getState().user?.id],
        data,
      );
    },
  });
}

export function useCreateComment(incidentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) =>
      apiFetch<TicketComment>(`/incidents/${incidentId}/comments`, {
        method: "POST",
        body: { content },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [...incidentsKey, incidentId, "comments"],
      });
    },
  });
}

export function appendIncidentComment(
  queryClient: ReturnType<typeof useQueryClient>,
  incidentId: string,
  comment: TicketComment,
) {
  queryClient.setQueryData<TicketComment[]>(
    [...incidentsKey, incidentId, "comments", useAuthStore.getState().user?.id],
    (prev) => {
      if (!prev) return [comment];
      if (prev.some((c) => c.id === comment.id)) return prev;
      return [...prev, comment];
    },
  );
}
