import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api-client";
import type { ServiceCatalogItem, ServiceRequest, Urgency } from "@/types/api";

const CATALOG_KEY = ["service-catalog"] as const;
const REQUESTS_KEY = ["service-requests"] as const;

type ListResponse<T> = { data: T[] };

export function useServiceCatalog() {
  return useQuery({
    queryKey: CATALOG_KEY,
    queryFn: async () => {
      const res = await apiFetch<ListResponse<ServiceCatalogItem>>("/service-catalog");
      return res.data;
    },
  });
}

export function useServiceRequests() {
  return useQuery({
    queryKey: REQUESTS_KEY,
    queryFn: async () => {
      const res = await apiFetch<ListResponse<ServiceRequest>>("/service-requests");
      return res.data;
    },
  });
}

export function useCreateServiceRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      catalogId: string;
      catalogName: string;
      justification: string;
      urgency: Urgency;
      fields: Record<string, string>;
    }) => {
      return apiFetch<ServiceRequest>("/service-requests", {
        method: "POST",
        body: JSON.stringify({
          catalogId: input.catalogId,
          justification: input.justification,
          urgency: input.urgency,
          fields: input.fields,
        }),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: REQUESTS_KEY });
    },
  });
}

export function useApproveServiceRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      apiFetch<ServiceRequest>(`/service-requests/${id}/approve`, {
        method: "PATCH",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: REQUESTS_KEY });
    },
  });
}

export function useRejectServiceRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; reason: string }) =>
      apiFetch<ServiceRequest>(`/service-requests/${input.id}/reject`, {
        method: "PATCH",
        body: JSON.stringify({ reason: input.reason }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: REQUESTS_KEY });
    },
  });
}
