import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  mockChanges,
  updateMockChangeStatus,
} from "@/lib/mocks/service-catalog";
import { useAuthStore } from "@/stores/auth-store";
import type { ChangeStatus } from "@/types/api";

const CHANGES_KEY = ["changes"] as const;

function delay(ms = 250) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useChanges() {
  return useQuery({
    queryKey: CHANGES_KEY,
    queryFn: async () => {
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
      await delay(300);
      const updated = updateMockChangeStatus(input.id, input.status, user?.id);
      if (!updated) throw new Error("Change not found");
      return updated;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CHANGES_KEY });
    },
  });
}
