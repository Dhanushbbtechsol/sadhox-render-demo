import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import type { TicketComment, TicketType } from "@/types/itsm";

const commentsKey = (ticketType: TicketType, ticketId: string) =>
  ["comments", ticketType, ticketId] as const;

export function useTicketComments(ticketType: TicketType, ticketId: string | undefined) {
  return useQuery({
    queryKey: commentsKey(ticketType, ticketId ?? ""),
    enabled: Boolean(ticketId),
    queryFn: async () => {
      const params = new URLSearchParams({
        ticketType,
        ticketId: ticketId!,
      });
      return apiFetch<TicketComment[]>(`/comments?${params}`);
    },
  });
}

export function useCreateTicketComment(ticketType: TicketType, ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) =>
      apiFetch<TicketComment>("/comments", {
        method: "POST",
        body: { ticketType, ticketId, content },
      }),
    onSuccess: (created) => {
      appendTicketComment(queryClient, ticketType, ticketId, created);
    },
  });
}

export function appendTicketComment(
  queryClient: QueryClient,
  ticketType: TicketType,
  ticketId: string,
  comment: TicketComment,
) {
  queryClient.setQueryData<TicketComment[]>(
    commentsKey(ticketType, ticketId),
    (prev) => {
      if (!prev) return [comment];
      if (prev.some((c) => c.id === comment.id)) return prev;
      return [...prev, comment];
    },
  );
}
