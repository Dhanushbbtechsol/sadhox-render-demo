import { ArrowLeftIcon } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";

import { Can } from "@/components/auth/protected-route";
import { TicketComments } from "@/components/comments/ticket-comments";
import { EmptyState, TicketListSkeleton } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  useFulfillServiceRequest,
  useServiceRequest,
  useStartFulfillment,
} from "@/hooks/use-service-requests";

function statusVariant(status: string) {
  if (status === "Approved" || status === "Fulfilled") return "success" as const;
  if (status === "Rejected") return "destructive" as const;
  if (status === "In Fulfillment") return "default" as const;
  return "outline" as const;
}

export default function RequestDetailPage() {
  const { id } = useParams();
  const { data, isLoading, isError, error } = useServiceRequest(id);
  const startFulfillment = useStartFulfillment();
  const fulfill = useFulfillServiceRequest();
  const [notes, setNotes] = useState("");

  if (isLoading) return <TicketListSkeleton rows={3} />;

  if (isError || !data) {
    return (
      <EmptyState
        title="Request not found"
        description={error instanceof Error ? error.message : "This request does not exist."}
        action={<Button render={<Link to="/requests" />}>Back to requests</Button>}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" render={<Link to="/requests" />} className="-ml-2">
        <ArrowLeftIcon />
        Back to requests
      </Button>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground bg-muted rounded-md px-1.5 py-0.5 font-mono text-[11px]">
              {data.id.slice(0, 8)}
            </span>
            <Badge variant={statusVariant(data.status)}>{data.status}</Badge>
            <Badge variant="outline">{data.urgency}</Badge>
          </div>
          <CardTitle className="text-xl">{data.catalogName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
              Justification
            </p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{data.justification}</p>
          </div>

          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground text-xs">Requester</dt>
              <dd className="text-sm font-medium">{data.requesterName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Created</dt>
              <dd className="text-sm">{new Date(data.createdAt).toLocaleString()}</dd>
            </div>
            {data.rejectionReason ? (
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground text-xs">Rejection reason</dt>
                <dd className="text-sm">{data.rejectionReason}</dd>
              </div>
            ) : null}
            {data.fulfillmentNotes ? (
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground text-xs">Completion notes</dt>
                <dd className="text-sm whitespace-pre-wrap">{data.fulfillmentNotes}</dd>
              </div>
            ) : null}
          </dl>

          <Can roles={["Admin", "Agent"]}>
            <div className="border-border/80 space-y-3 border-t pt-4">
              {data.status === "Approved" ? (
                <Button
                  disabled={startFulfillment.isPending}
                  onClick={async () => {
                    try {
                      await startFulfillment.mutateAsync(data.id);
                      toast.success("Fulfillment started");
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Failed to start");
                    }
                  }}
                >
                  {startFulfillment.isPending ? "Starting…" : "Start fulfillment"}
                </Button>
              ) : null}

              {data.status === "In Fulfillment" ? (
                <div className="space-y-2">
                  <Textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Completion notes…"
                  />
                  <Button
                    disabled={fulfill.isPending || !notes.trim()}
                    onClick={async () => {
                      try {
                        await fulfill.mutateAsync({ id: data.id, notes: notes.trim() });
                        toast.success("Request fulfilled");
                        setNotes("");
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Fulfill failed");
                      }
                    }}
                  >
                    {fulfill.isPending ? "Saving…" : "Mark fulfilled"}
                  </Button>
                </div>
              ) : null}
            </div>
          </Can>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <TicketComments ticketType="service_request" ticketId={data.id} />
        </CardContent>
      </Card>
    </div>
  );
}
