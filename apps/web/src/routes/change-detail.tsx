import { ArrowLeftIcon, CalendarClockIcon } from "lucide-react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";

import { Can } from "@/components/auth/protected-route";
import { TicketComments } from "@/components/comments/ticket-comments";
import { EmptyState, TicketListSkeleton } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useApproveChange,
  useChange,
  useUpdateChangeStatus,
} from "@/hooks/use-changes";

function statusVariant(status: string) {
  if (status === "Approved" || status === "Implemented" || status === "Closed") {
    return "success" as const;
  }
  if (status === "Rolled Back") return "destructive" as const;
  if (status === "Scheduled") return "default" as const;
  return "outline" as const;
}

export default function ChangeDetailPage() {
  const { id } = useParams();
  const { data, isLoading, isError, error } = useChange(id);
  const approveChange = useApproveChange();
  const updateStatus = useUpdateChangeStatus();

  if (isLoading) return <TicketListSkeleton rows={3} />;

  if (isError || !data) {
    return (
      <EmptyState
        title="Change not found"
        description={error instanceof Error ? error.message : "This change does not exist."}
        action={<Button render={<Link to="/changes" />}>Back to changes</Button>}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" render={<Link to="/changes" />} className="-ml-2">
        <ArrowLeftIcon />
        Back to changes
      </Button>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground bg-muted rounded-md px-1.5 py-0.5 font-mono text-[11px]">
              {data.id.slice(0, 8)}
            </span>
            <Badge variant={statusVariant(data.status)}>{data.status}</Badge>
            <Badge variant="secondary">{data.type}</Badge>
          </div>
          <CardTitle className="text-xl">{data.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="rollback">Rollback plan</TabsTrigger>
              <TabsTrigger value="discussion">Discussion</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-5 pt-4">
              <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
                {data.description || "No description."}
              </p>

              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground text-xs">Created by</dt>
                  <dd className="text-sm font-medium">{data.createdByName}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Created</dt>
                  <dd className="text-sm">{new Date(data.createdAt).toLocaleString()}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs">
                    <CalendarClockIcon className="size-3.5" />
                    Maintenance window
                  </dt>
                  <dd className="text-sm">
                    {data.scheduledStart
                      ? new Date(data.scheduledStart).toLocaleString()
                      : "—"}
                    {" → "}
                    {data.scheduledEnd
                      ? new Date(data.scheduledEnd).toLocaleString()
                      : "—"}
                  </dd>
                </div>
              </dl>

              <Can roles={["Admin", "Agent"]}>
                <div className="flex flex-wrap gap-2 border-t pt-4">
                  <Can roles={["Admin"]}>
                    {data.status === "Submitted" || data.status === "Draft" ? (
                      <Button
                        disabled={approveChange.isPending}
                        onClick={async () => {
                          try {
                            await approveChange.mutateAsync(data.id);
                            toast.success("Change approved");
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : "Approve failed");
                          }
                        }}
                      >
                        Approve
                      </Button>
                    ) : null}
                  </Can>
                  <Can roles={["Admin"]}>
                    {data.status === "Approved" ? (
                      <Button
                        variant="outline"
                        disabled={updateStatus.isPending}
                        onClick={async () => {
                          try {
                            await updateStatus.mutateAsync({
                              id: data.id,
                              status: "Scheduled",
                            });
                            toast.success("Change scheduled");
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : "Schedule failed");
                          }
                        }}
                      >
                        Mark scheduled
                      </Button>
                    ) : null}
                  </Can>
                  {data.status === "Scheduled" ? (
                    <Button
                      disabled={updateStatus.isPending}
                      onClick={async () => {
                        try {
                          await updateStatus.mutateAsync({
                            id: data.id,
                            status: "Implemented",
                          });
                          toast.success("Change marked implemented");
                        } catch (err) {
                          toast.error(
                            err instanceof Error ? err.message : "Update failed",
                          );
                        }
                      }}
                    >
                      Mark implemented
                    </Button>
                  ) : null}
                </div>
              </Can>
            </TabsContent>

            <TabsContent value="rollback" className="pt-4">
              <div className="border-border/80 bg-muted/20 rounded-xl border p-4">
                <h2 className="mb-2 text-sm font-semibold">Rollback plan</h2>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {data.rollbackPlan?.trim() ||
                    "No rollback plan recorded for this change."}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="discussion" className="pt-4">
              <TicketComments ticketType="change" ticketId={data.id} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
