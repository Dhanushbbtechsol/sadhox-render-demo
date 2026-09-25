import { toast } from "sonner";

import { Can } from "@/components/auth/protected-route";
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
import { useChanges, useUpdateChangeStatus } from "@/hooks/use-changes";

export function ChangesTable() {
  const { data, isLoading, isError } = useChanges();
  const updateStatus = useUpdateChangeStatus();

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (isError) {
    return <p className="text-destructive text-sm">Failed to load changes.</p>;
  }

  if (!data?.length) {
    return <p className="text-muted-foreground text-sm">No change records yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Schedule</TableHead>
          <TableHead>Created by</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((change) => (
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
            <TableCell>
              <Badge variant="secondary">{change.status}</Badge>
            </TableCell>
            <TableCell className="text-xs">
              {new Date(change.scheduledStart).toLocaleString()}
              <br />
              {new Date(change.scheduledEnd).toLocaleString()}
            </TableCell>
            <TableCell>{change.createdByName}</TableCell>
            <TableCell className="space-x-2 text-right">
              <Can roles={["Admin"]}>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={updateStatus.isPending || change.status === "Approved"}
                  onClick={async () => {
                    try {
                      await updateStatus.mutateAsync({ id: change.id, status: "Approved" });
                      toast.success("Change approved (stub)");
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Approve failed");
                    }
                  }}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={updateStatus.isPending || change.status === "Rolled Back"}
                  onClick={async () => {
                    try {
                      await updateStatus.mutateAsync({ id: change.id, status: "Rolled Back" });
                      toast.message("Change rejected (stub)");
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Reject failed");
                    }
                  }}
                >
                  Reject
                </Button>
              </Can>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
