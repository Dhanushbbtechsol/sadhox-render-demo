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
import { recordReference } from "@/lib/record-reference";

function statusVariant(status: string) {
  if (status === "Approved" || status === "Implemented" || status === "Closed") {
    return "success" as const;
  }
  if (status === "Rolled Back") return "destructive" as const;
  if (status === "Scheduled") return "default" as const;
  return "outline" as const;
}

function isPendingApproval(status: string) {
  return (
    status === "Submitted" ||
    status === "Draft" ||
    status === "PendingApproval"
  );
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
              {recordReference(data.referenceCode, data.id)}
            </span>
            <Badge variant={statusVariant(data.status)}>{data.status}</Badge>
            <Badge variant="secondary">{data.type}</Badge>
          </div>
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Change request
          </p>
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
                <div>
                  <dt className="text-muted-foreground text-xs">Project</dt>
                  <dd className="text-sm">{data.projectName ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Module</dt>
                  <dd className="text-sm">{data.moduleName ?? "—"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs">
                    <CalendarClockIcon className="size-3.5" />
                    Requested window
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

              <Can roles={["Admin", "Manager"]}>
                {isPendingApproval(data.status) ? (
                  <div className="flex flex-wrap gap-2 border-t pt-4">
                    <Button
                      disabled={approveChange.isPending}
                      onClick={async () => {
                        try {
                          await approveChange.mutateAsync(data.id);
                          toast.success("Change approved");
                        } catch (err) {
                          toast.error(
                            err instanceof Error ? err.message : "Approve failed",
                          );
                        }
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={updateStatus.isPending}
                      onClick={async () => {
                        try {
                          await updateStatus.mutateAsync({
                            id: data.id,
                            status: "Rolled Back",
                          });
                          toast.message("Change rejected");
                        } catch (err) {
                          toast.error(
                            err instanceof Error ? err.message : "Reject failed",
                          );
                        }
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                ) : null}
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
