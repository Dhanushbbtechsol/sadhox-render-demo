import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  MOCK_CATALOG,
  addMockServiceRequest,
  mockServiceRequests,
} from "@/lib/mocks/service-catalog";
import { useAuthStore } from "@/stores/auth-store";
import type { ServiceRequest, Urgency } from "@/types/api";

const CATALOG_KEY = ["service-catalog"] as const;
const REQUESTS_KEY = ["service-requests"] as const;

function delay(ms = 250) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useServiceCatalog() {
  return useQuery({
    queryKey: CATALOG_KEY,
    queryFn: async () => {
      await delay();
      return MOCK_CATALOG;
    },
  });
}

export function useServiceRequests() {
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: [...REQUESTS_KEY, user?.id, user?.role],
    queryFn: async () => {
      await delay();
      if (!user) return [] as ServiceRequest[];
      if (user.role === "EndUser") {
        return mockServiceRequests.filter((request) => request.requesterId === user.id);
      }
      return [...mockServiceRequests];
    },
  });
}

export function useCreateServiceRequest() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: async (input: {
      catalogId: string;
      catalogName: string;
      justification: string;
      urgency: Urgency;
      fields: Record<string, string>;
    }) => {
      await delay(350);
      if (!user) throw new Error("Not authenticated");

      const request: ServiceRequest = {
        id: `sr-${Date.now()}`,
        catalogId: input.catalogId,
        catalogName: input.catalogName,
        requesterId: user.id,
        requesterName: user.name,
        status: "Submitted",
        justification: input.justification,
        urgency: input.urgency,
        fields: input.fields,
        createdAt: new Date().toISOString(),
      };

      return addMockServiceRequest(request);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: REQUESTS_KEY });
    },
  });
}
