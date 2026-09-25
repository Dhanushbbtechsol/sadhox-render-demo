import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { calculatePriority } from "@/types/itsm";
import type { CreateIncidentInput, Incident, Problem } from "@/types/itsm";
import { MOCK_INCIDENTS, MOCK_PROBLEMS } from "@/lib/mock-data";

const incidentsKey = ["incidents"] as const;
const problemsKey = ["problems"] as const;

function delay<T>(value: T, ms = 450): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), ms);
  });
}

/** In-memory stub store until Dev D OpenAPI + live CRUD lands. */
let incidentStore: Incident[] = [...MOCK_INCIDENTS];
let problemStore: Problem[] = [...MOCK_PROBLEMS];

export function useIncidents() {
  return useQuery({
    queryKey: incidentsKey,
    queryFn: () => delay([...incidentStore]),
  });
}

export function useIncident(id: string | undefined) {
  return useQuery({
    queryKey: [...incidentsKey, id],
    enabled: Boolean(id),
    queryFn: async () => {
      const incident = incidentStore.find((item) => item.id === id);
      if (!incident) throw new Error("Incident not found");
      return delay(incident);
    },
  });
}

export function useProblems() {
  return useQuery({
    queryKey: problemsKey,
    queryFn: () => delay([...problemStore]),
  });
}

export function useCreateIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateIncidentInput) => {
      const now = new Date().toISOString();
      const created: Incident = {
        id: `inc-${String(incidentStore.length + 1).padStart(3, "0")}`,
        title: input.title,
        description: input.description,
        category: input.category,
        impact: input.impact,
        urgency: input.urgency,
        priority: calculatePriority(input.impact, input.urgency),
        status: "New",
        assignedTo: null,
        reporterId: "current-user",
        slaDueAt: null,
        resolvedAt: null,
        closedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      incidentStore = [created, ...incidentStore];
      return delay(created, 300);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: incidentsKey });
    },
  });
}

/** Test helper — not for production. */
export function __resetMockStores() {
  incidentStore = [...MOCK_INCIDENTS];
  problemStore = [...MOCK_PROBLEMS];
}
