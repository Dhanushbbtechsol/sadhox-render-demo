import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  useRejectServiceRequest,
  useServiceRequests,
} from "@/hooks/use-service-requests";

export function ApprovalInboxTable() {
  const { data: requests, isLoading: loadingRequests } = useServiceRequests();
  const { data: changes, isLoading: loadingChanges } = useChanges();
  const approveRequest = useApproveServiceRequest();
  const rejectRequest = useRejectServiceRequest();
  const approveChange = useApproveChange();
  const updateChange = useUpdateChangeStatus();
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});

  const pendingRequests = useMemo(
    () => (requests ?? []).filter((r) => r.status === "Submitted"),
    [requests],
  );
  const pendingChanges = useMemo(
    () =>
      (changes ?? []).filter(
        (c) => c.status === "Submitted" || c.status === "Draft",
      ),
    [changes],
  );

  if (loadingRequests || loadingChanges) {
    return <Skeleton className="h-56 w-full" />;
  }

  return (
    <Tabs defaultValue="requests">
      <TabsList>
        <TabsTrigger value="requests">
          Requests ({pendingRequests.length})
        </TabsTrigger>
        <TabsTrigger value="changes">
          Changes ({pendingChanges.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="requests" className="mt-4 space-y-3">
        {!pendingRequests.length ? (
          <p className="text-muted-foreground text-sm">
            No pending service requests.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead>Urgency</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Reject reason</TableHead>
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
                  <TableCell>{request.requesterName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{request.urgency}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {new Date(request.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Input
                      placeholder="Required to reject"
                      value={rejectReasons[request.id] ?? ""}
                      onChange={(event) =>
                        setRejectReasons((prev) => ({
                          ...prev,
                          [request.id]: event.target.value,
                        }))
                      }
                    />
                  </TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button
                      size="sm"
                      disabled={approveRequest.isPending}
                      onClick={async () => {
                        try {
                          await approveRequest.mutateAsync(request.id);
                          toast.success("Request approved");
                        } catch (error) {
                          toast.error(
                            error instanceof Error
                              ? error.message
                              : "Approve failed",
                          );
                        }
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={rejectRequest.isPending}
                      onClick={async () => {
                        const reason = (rejectReasons[request.id] ?? "").trim();
                        if (!reason) {
                          toast.error("Rejection reason is required");
                          return;
                        }
                        try {
                          await rejectRequest.mutateAsync({
                            id: request.id,
                            reason,
                          });
                          toast.message("Request rejected");
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

      <TabsContent value="changes" className="mt-4 space-y-3">
        {!pendingChanges.length ? (
          <p className="text-muted-foreground text-sm">No pending changes.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Schedule</TableHead>
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
                      onClick={async () => {
                        try {
                          await approveChange.mutateAsync(change.id);
                          toast.success("Change approved");
                        } catch (error) {
                          toast.error(
                            error instanceof Error
                              ? error.message
                              : "Approve failed",
                          );
                        }
                      }}
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
                          toast.message("Change rolled back / rejected");
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
  );
}
