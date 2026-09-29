import { useQueryClient } from "@tanstack/react-query";
import { SendIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  appendTicketComment,
  useCreateTicketComment,
  useTicketComments,
} from "@/hooks/use-comments";
import { useTicketSocket } from "@/hooks/use-ticket-socket";
import type { TicketComment, TicketType } from "@/types/itsm";

export function TicketComments({
  ticketType,
  ticketId,
}: {
  ticketType: TicketType;
  ticketId: string;
}) {
  const queryClient = useQueryClient();
  const { data: comments, isLoading } = useTicketComments(ticketType, ticketId);
  const createComment = useCreateTicketComment(ticketType, ticketId);
  const [draft, setDraft] = useState("");

  useTicketSocket(ticketId, (payload) => {
    const comment = payload as TicketComment;
    if (!comment?.id) return;
    if (comment.ticketType && comment.ticketType !== ticketType) return;
    appendTicketComment(queryClient, ticketType, ticketId, comment);
  });

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (!content) return;

    try {
      await createComment.mutateAsync(content);
      setDraft("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to post comment");
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold tracking-tight">Discussion</h2>

      <div className="space-y-3">
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading comments…</p>
        ) : null}

        {!isLoading && (!comments || comments.length === 0) ? (
          <p className="text-muted-foreground text-sm">No comments yet.</p>
        ) : null}

        {comments?.map((comment) => (
          <div
            key={comment.id}
            className="border-border/80 bg-muted/30 rounded-xl border px-3.5 py-3"
          >
            <div className="text-muted-foreground mb-1 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-foreground font-medium">
                {comment.authorName ?? "User"}
              </span>
              <span>{new Date(comment.createdAt).toLocaleString()}</span>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{comment.content}</p>
          </div>
        ))}
      </div>

      <form className="space-y-2" onSubmit={onSubmit}>
        <Textarea
          rows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a comment…"
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={createComment.isPending || !draft.trim()}>
            <SendIcon />
            {createComment.isPending ? "Posting…" : "Post comment"}
          </Button>
        </div>
      </form>
    </div>
  );
}
