import { useMemo, useState } from "react";
import { toast } from "sonner";

import { RejectRequestDialog } from "@/components/approvals/reject-request-dialog";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useApproveChange,
  useChanges,
  useUpdateChangeStatus,
} from "@/hooks/use-changes";
import {
  useApproveServiceRequest,
  useServiceRequests,
} from "@/hooks/use-service-requests";
import { useAuthStore } from "@/stores/auth-store";
import type { ChangeRecord, ServiceRequest, UserRole } from "@/types/api";

/** Phase 8 waiting copy for the approval chain. */
function waitingLabel(item: {
  status: string;
  projectId?: string | null;
}): "Waiting on manager" | "Waiting on admin" {
  if (item.status === "PendingApproval") return "Waiting on admin";
  if (item.status === "Submitted" && item.projectId) {
    return "Waiting on manager";
  }
  return "Waiting on admin";
}

function hasProject(item: { projectId?: string | null }): boolean {
  return Boolean(item.projectId);
}

/** Manager inbox: owned-project tickets in Submitted (list is already project-scoped). */
function inManagerInbox(item: {
  status: string;
  projectId?: string | null;
}): boolean {
  return item.status === "Submitted" && hasProject(item);
}

/**
 * Admin inbox for service requests: PendingApproval, plus Submitted with no project.
 * Submitted tickets that still need a manager stay out of the Admin queue.
 */
function inAdminRequestInbox(item: {
  status: string;
  projectId?: string | null;
}): boolean {
  if (item.status === "PendingApproval") return true;
  return item.status === "Submitted" && !hasProject(item);
}

/** Waiting change requests — Admin sees all; Manager list is already project-scoped. */
function inChangeInbox(item: { status: string }): boolean {
  return (
    item.status === "Submitted" ||
    item.status === "Draft" ||
    item.status === "PendingApproval"
  );
}

function filterRequestsForRole<
  T extends { status: string; projectId?: string | null },
>(items: T[], role: UserRole | undefined): T[] {
  if (role === "Manager") return items.filter(inManagerInbox);
  if (role === "Admin") return items.filter(inAdminRequestInbox);
  return [];
}

function filterChangesForRole<T extends { status: string }>(
  items: T[],
  role: UserRole | undefined,
): T[] {
  // Admin or Manager can final-approve changes (Manager = fallback on own projects).
  if (role === "Admin" || role === "Manager") {
    return items.filter(inChangeInbox);
  }
  return [];
}

export function ApprovalInboxTable() {
  const role = useAuthStore((s) => s.user?.role);
  const isManager = role === "Manager";
  const { data: requests, isLoading: loadingRequests } = useServiceRequests();
  const { data: changes, isLoading: loadingChanges } = useChanges();
  const approveRequest = useApproveServiceRequest();
  const approveChange = useApproveChange();
  const updateChange = useUpdateChangeStatus();
  const [rejectTarget, setRejectTarget] = useState<{
    id: string;
    label: string;
  } | null>(null);

  const pendingRequests = useMemo(
    () => filterRequestsForRole(requests ?? [], role),
    [requests, role],
  );
  const pendingChanges = useMemo(
    () => filterChangesForRole(changes ?? [], role),
    [changes, role],
  );

  async function handleApproveRequest(request: ServiceRequest) {
    try {
      const result = await approveRequest.mutateAsync(request.id);
      if (result.status === "PendingApproval") {
        toast.success("Sent to admin for final approval");
      } else {
        toast.success("Request approved");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Approve failed",
      );
    }
  }

  async function handleApproveChange(change: ChangeRecord) {
    try {
      await approveChange.mutateAsync(change.id);
      toast.success("Change approved");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Approve failed",
      );
    }
  }

  if (loadingRequests || loadingChanges) {
    return <Skeleton className="h-56 w-full" />;
  }

  const approveLabel = isManager ? "Send to admin" : "Approve";

  return (
    <>
      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests">
            Service Requests ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="changes">
            Changes ({pendingChanges.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="mt-4 space-y-3">
          {!pendingRequests.length ? (
            <EmptyState
              title="No pending approvals"
              description={
                isManager
                  ? "Submitted service requests on projects you manage will show up here."
                  : "Requests waiting on admin (after manager approval, or with no project) will show up here."
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Waiting on</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead>Urgency</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{request.catalogName}</p>
                        <p className="text-muted-foreground line-clamp-1 text-xs">
                          {request.justification}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {request.projectName ?? "—"}
                      {request.moduleName ? ` / ${request.moduleName}` : ""}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{waitingLabel(request)}</Badge>
                    </TableCell>
                    <TableCell>{request.requesterName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{request.urgency}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(request.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button
                        size="sm"
                        disabled={approveRequest.isPending}
                        onClick={() => void handleApproveRequest(request)}
                      >
                        {approveLabel}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          setRejectTarget({
                            id: request.id,
                            label: request.catalogName,
                          })
                        }
                      >
                        Reject
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="changes" className="mt-4 space-y-3">
          {!pendingChanges.length ? (
            <EmptyState
              title="No pending changes"
              description={
                isManager
                  ? "Submitted changes on projects you manage will appear here so you can approve if Admin has not."
                  : "Requested changes waiting on Admin or Manager approval will appear here."
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Requested window</TableHead>
                  <TableHead>Created by</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingChanges.map((change) => (
                  <TableRow key={change.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{change.title}</p>
                        <p className="text-muted-foreground line-clamp-1 text-xs">
                          {change.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {change.projectName ?? "—"}
                      {change.moduleName ? ` / ${change.moduleName}` : ""}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{change.type}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {change.scheduledStart
                        ? new Date(change.scheduledStart).toLocaleString()
                        : "—"}
                      <br />
                      {change.scheduledEnd
                        ? new Date(change.scheduledEnd).toLocaleString()
                        : "—"}
                    </TableCell>
                    <TableCell>{change.createdByName}</TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button
                        size="sm"
                        disabled={approveChange.isPending}
                        onClick={() => void handleApproveChange(change)}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={updateChange.isPending}
                        onClick={async () => {
                          try {
                            await updateChange.mutateAsync({
                              id: change.id,
                              status: "Rolled Back",
                            });
                            toast.success("Change rejected");
                          } catch (error) {
                            toast.error(
                              error instanceof Error
                                ? error.message
                                : "Reject failed",
                            );
                          }
                        }}
                      >
                        Reject
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>

      <RejectRequestDialog
        requestId={rejectTarget?.id ?? null}
        requestLabel={rejectTarget?.label}
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
      />
    </>
  );
}
