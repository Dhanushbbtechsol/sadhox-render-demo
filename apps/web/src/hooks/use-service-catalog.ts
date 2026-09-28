import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type { ServiceCatalogItem, ServiceRequest, Urgency } from "@/types/api";

const CATALOG_KEY = ["service-catalog"] as const;
const REQUESTS_KEY = ["service-requests"] as const;

export function useServiceCatalog() {
  const userId = useAuthStore((state) => state.user?.id);

  return useQuery({
    queryKey: [...CATALOG_KEY, userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const result = await apiFetch<{ data: ServiceCatalogItem[] }>("/service-catalog");
      return result.data;
    },
  });
}

export function useServiceRequests() {
  const userId = useAuthStore((state) => state.user?.id);

  return useQuery({
    queryKey: [...REQUESTS_KEY, userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const result = await apiFetch<{ data: ServiceRequest[] }>("/service-requests");
      return result.data;
    },
  });
}

export function useCreateServiceRequest() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);

  return useMutation({
    mutationFn: async (input: {
      catalogId: string;
      catalogName: string;
      justification: string;
      urgency: Urgency;
      fields: Record<string, string>;
    }) => {
      if (!userId) throw new Error("Not authenticated");

      return apiFetch<ServiceRequest>("/service-requests", {
        method: "POST",
        body: {
          catalogId: input.catalogId,
          justification: input.justification,
          urgency: input.urgency,
          fields: input.fields,
        },
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: REQUESTS_KEY });
    },
  });
}
