import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import type {
  ChangeRecord,
  ChangeStatus,
  ChangeType,
} from "@/types/api";

const CHANGES_KEY = ["changes"] as const;

type ListResponse<T> = { data: T[] };

export function useChanges(filters?: {
  type?: ChangeType;
  status?: ChangeStatus;
}) {
  const params = new URLSearchParams();
  if (filters?.type) params.set("type", filters.type);
  if (filters?.status) params.set("status", filters.status);
  const qs = params.toString();

  return useQuery({
    queryKey: [...CHANGES_KEY, filters?.type ?? null, filters?.status ?? null],
    queryFn: async () => {
      const res = await apiFetch<ListResponse<ChangeRecord>>(
        `/changes${qs ? `?${qs}` : ""}`,
      );
      return res.data;
    },
  });
}

export function useCreateChange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      description: string;
      type: ChangeType;
      scheduledStart: string;
      scheduledEnd: string;
      rollbackPlan: string;
      projectId?: string | null;
      moduleId?: string | null;
    }) =>
      apiFetch<ChangeRecord>("/changes", {
        method: "POST",
        body: {
          title: input.title,
          description: input.description,
          type: input.type,
          scheduledStart: input.scheduledStart,
          scheduledEnd: input.scheduledEnd,
          rollbackPlan: input.rollbackPlan,
          ...(input.projectId ? { projectId: input.projectId } : {}),
          ...(input.moduleId ? { moduleId: input.moduleId } : {}),
        },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CHANGES_KEY });
    },
  });
}

export function useApproveChange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      apiFetch<ChangeRecord>(`/changes/${id}/approve`, { method: "PATCH" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CHANGES_KEY });
    },
  });
}

export function useRejectChange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; reason: string }) =>
      apiFetch<ChangeRecord>(`/changes/${input.id}/reject`, {
        method: "PATCH",
        body: { reason: input.reason },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CHANGES_KEY });
    },
  });
}

export function useUpdateChangeStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: ChangeStatus }) =>
      apiFetch<ChangeRecord>(`/changes/${input.id}`, {
        method: "PATCH",
        body: { status: input.status },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CHANGES_KEY });
    },
  });
}

export function useChange(id: string | undefined) {
  return useQuery({
    queryKey: [...CHANGES_KEY, "detail", id],
    enabled: Boolean(id),
    queryFn: () => apiFetch<ChangeRecord>(`/changes/${id}`),
  });
}
