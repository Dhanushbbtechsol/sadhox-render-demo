import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { RejectRequestDialog } from "@/components/approvals/reject-request-dialog";
import { EmptyState } from "@/components/empty-state";
import { ListPagination, paginateItems } from "@/components/list-pagination";
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
} from "@/hooks/use-changes";
import {
  useApproveServiceRequest,
  useServiceRequests,
} from "@/hooks/use-service-requests";
import { useAuthStore } from "@/stores/auth-store";
import type { ChangeRecord, ServiceRequest, UserRole } from "@/types/api";

/** Phase 9 waiting copy for the org-chart approval chain. */
function waitingLabel(item: {
  status: string;
  requesterReportsToId?: string | null;
  creatorReportsToId?: string | null;
}): "Waiting on manager" | "Waiting on admin" {
  if (item.status === "PendingApproval") return "Waiting on admin";
  const reportsTo =
    item.requesterReportsToId ?? item.creatorReportsToId ?? null;
  if (item.status === "Submitted" && reportsTo) {
    return "Waiting on manager";
  }
  return "Waiting on admin";
}

function hasReportsToManager(item: {
  requesterReportsToId?: string | null;
  creatorReportsToId?: string | null;
}): boolean {
  return Boolean(item.requesterReportsToId ?? item.creatorReportsToId);
}

/**
 * Manager inbox: Submitted tickets whose requester/creator reports to them.
 * (List API already scopes Managers to their direct reports.)
 */
function inManagerInbox(item: { status: string }): boolean {
  return item.status === "Submitted";
}

/**
 * Admin inbox: PendingApproval, plus Submitted with no manager (one-step).
 * Submitted that still need a manager stay out of the Admin queue.
 */
function inAdminInbox(item: {
  status: string;
  requesterReportsToId?: string | null;
  creatorReportsToId?: string | null;
}): boolean {
  if (item.status === "PendingApproval") return true;
  return item.status === "Submitted" && !hasReportsToManager(item);
}

function filterForRole<
  T extends {
    status: string;
    requesterReportsToId?: string | null;
    creatorReportsToId?: string | null;
  },
>(items: T[], role: UserRole | undefined): T[] {
  if (role === "Manager") return items.filter(inManagerInbox);
  if (role === "Admin") return items.filter(inAdminInbox);
  return [];
}

export function ApprovalInboxTable() {
  const role = useAuthStore((s) => s.user?.role);
  const isManager = role === "Manager";
  const { data: requests, isLoading: loadingRequests } = useServiceRequests();
  const { data: changes, isLoading: loadingChanges } = useChanges();
  const approveRequest = useApproveServiceRequest();
  const approveChange = useApproveChange();
  const [rejectTarget, setRejectTarget] = useState<{
    kind: "request" | "change";
    id: string;
    label: string;
  } | null>(null);
  const [tab, setTab] = useState("requests");
  const [page, setPage] = useState(1);

  const pendingRequests = useMemo(
    () => filterForRole(requests ?? [], role),
    [requests, role],
  );
  const pendingChanges = useMemo(
    () => filterForRole(changes ?? [], role),
    [changes, role],
  );
  const pagedRequests = useMemo(
    () => paginateItems(pendingRequests, page),
    [pendingRequests, page],
  );
  const pagedChanges = useMemo(
    () => paginateItems(pendingChanges, page),
    [pendingChanges, page],
  );

  useEffect(() => {
    setPage(1);
  }, [tab]);

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
      const result = await approveChange.mutateAsync(change.id);
      if (result.status === "PendingApproval") {
        toast.success("Sent to admin for final approval");
      } else {
        toast.success("Change approved");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Approve failed",
      );
    }
  }

  if (loadingRequests || loadingChanges) {
    return <Skeleton className="h-56 w-full" />;
  }

  // Manager never sees a final Approve label — only Send to admin.
  const approveLabel = isManager ? "Send to admin" : "Approve";

  return (
    <>
      <Tabs value={tab} onValueChange={setTab}>
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
                  ? "Submitted service requests from people who report to you will show up here."
                  : "Requests waiting on admin (after manager approval, or with no manager) will show up here."
              }
            />
          ) : (
            <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Waiting on</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead>Urgency</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedRequests.items.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{request.catalogName}</p>
                        <p className="text-muted-foreground line-clamp-1 text-xs">
                          {request.justification}
                        </p>
                      </div>
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
                            kind: "request",
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
            <ListPagination
              page={pagedRequests.page}
              totalPages={pagedRequests.totalPages}
              total={pagedRequests.total}
              onPageChange={setPage}
              label="requests"
            />
            </>
          )}
        </TabsContent>

        <TabsContent value="changes" className="mt-4 space-y-3">
          {!pendingChanges.length ? (
            <EmptyState
              title="No pending changes"
              description={
                isManager
                  ? "Submitted changes from people who report to you will appear here."
                  : "Changes waiting on admin (after manager approval, or with no manager) will appear here."
              }
            />
          ) : (
            <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Waiting on</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Created by</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedChanges.items.map((change) => (
                  <TableRow key={change.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{change.title}</p>
                        <p className="text-muted-foreground line-clamp-1 text-xs">
                          {change.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{waitingLabel(change)}</Badge>
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
                        {approveLabel}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          setRejectTarget({
                            kind: "change",
                            id: change.id,
                            label: change.title,
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
            <ListPagination
              page={pagedChanges.page}
              totalPages={pagedChanges.totalPages}
              total={pagedChanges.total}
              onPageChange={setPage}
              label="changes"
            />
            </>
          )}
        </TabsContent>
      </Tabs>

      <RejectRequestDialog
        targetId={rejectTarget?.id ?? null}
        kind={rejectTarget?.kind}
        label={rejectTarget?.label}
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
      />
    </>
  );
}
