import { useQueryClient } from "@tanstack/react-query";
import { SendIcon } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  appendIncidentComment,
  useCreateComment,
  useIncidentComments,
} from "@/hooks/use-tickets";
import { useTicketSocket } from "@/hooks/use-ticket-socket";
import type { TicketComment } from "@/types/itsm";

export function IncidentComments({ incidentId }: { incidentId: string }) {
  const queryClient = useQueryClient();
  const { data: comments, isLoading } = useIncidentComments(incidentId);
  const createComment = useCreateComment(incidentId);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useTicketSocket(incidentId, (payload) => {
    const comment = payload as TicketComment;
    if (!comment?.id) return;
    appendIncidentComment(queryClient, incidentId, comment);
    // Keep newest comment visible without fighting concurrent posts.
    requestAnimationFrame(() => {
      listRef.current?.lastElementChild?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    });
  });

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || createComment.isPending) return;

    try {
      // Mutation onSuccess appends by id; socket may also append — id-deduped.
      await createComment.mutateAsync(content);
      setDraft("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to post comment");
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold tracking-tight">Discussion</h2>

      <div ref={listRef} className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
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
            {/* Plain text only — never dangerouslySetInnerHTML */}
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
          maxLength={4000}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              void onSubmit(e as unknown as React.FormEvent);
            }
          }}
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-muted-foreground text-[11px]">
            ⌘/Ctrl+Enter to post
          </p>
          <Button type="submit" disabled={createComment.isPending || !draft.trim()}>
            <SendIcon />
            {createComment.isPending ? "Posting…" : "Post comment"}
          </Button>
        </div>
      </form>
    </div>
  );
}
