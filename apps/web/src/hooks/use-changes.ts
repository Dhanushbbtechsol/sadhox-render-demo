import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { mockChanges, updateMockChangeStatus } from "@/lib/mocks/changes";
import { useAuthStore } from "@/stores/auth-store";
import type { ChangeRecord, ChangeStatus } from "@/types/api";

const CHANGES_KEY = ["changes"] as const;

function delay(ms = 250) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useChanges() {
  return useQuery({
    queryKey: CHANGES_KEY,
    queryFn: async (): Promise<ChangeRecord[]> => {
      // Authz check against Nest (Admin/Agent). Empty stub → mock polish for UI.
      const res = await apiFetch<{ data: ChangeRecord[] }>("/changes");
      if (Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
      await delay();
      return [...mockChanges];
    },
  });
}

export function useUpdateChangeStatus() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: async (input: { id: string; status: ChangeStatus }) => {
      // Server enforces Admin-only approve; mock update only after 2xx.
      await apiFetch(`/changes/${input.id}/status`, {
        method: "PATCH",
        body: { status: input.status },
      });
      const updated = updateMockChangeStatus(input.id, input.status, user?.id);
      if (!updated) throw new Error("Change not found");
      return updated;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CHANGES_KEY });
    },
  });
}
