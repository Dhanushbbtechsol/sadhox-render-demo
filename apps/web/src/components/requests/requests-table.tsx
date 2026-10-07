import { Link } from "react-router";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useServiceRequests } from "@/hooks/use-service-requests";
import type { ServiceRequest } from "@/types/api";

function statusVariant(status: string) {
  if (status === "Approved" || status === "Fulfilled") return "success" as const;
  if (status === "Rejected") return "destructive" as const;
  return "secondary" as const;
}

function RequestsDataTable({ rows }: { rows: ServiceRequest[] }) {
  if (!rows.length) {
    return <p className="text-muted-foreground text-sm">No service requests in this view.</p>;
  }

  return (
    <div className="border-border/80 bg-card overflow-hidden rounded-xl border shadow-soft">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>ID</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Requester</TableHead>
            <TableHead>Urgency</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((request) => (
            <TableRow
              key={request.id}
              className="hover:bg-accent/40 transition-colors"
            >
              <TableCell className="font-mono text-xs">
                <Link
                  to={`/requests/${request.id}`}
                  className="text-primary hover:underline"
                >
                  {request.id.slice(0, 8)}
                </Link>
              </TableCell>
              <TableCell className="font-medium">
                <Link
                  to={`/requests/${request.id}`}
                  className="hover:underline"
                >
                  {request.catalogName}
                </Link>
              </TableCell>
              <TableCell className="text-xs">
                {request.projectName ?? "—"}
              </TableCell>
              <TableCell>{request.requesterName}</TableCell>
              <TableCell>
                <Badge variant="outline">{request.urgency}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant(request.status)}>{request.status}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-xs">
                {new Date(request.createdAt).toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function RequestsTable() {
  const { data, isLoading, isError } = useServiceRequests();
  const [tab, setTab] = useState("all");

  const submitted = useMemo(
    () => (data ?? []).filter((request) => request.status === "Submitted"),
    [data],
  );

  if (isLoading) {
    return <Skeleton className="h-48 w-full rounded-xl" />;
  }

  if (isError) {
    return <p className="text-destructive text-sm">Failed to load service requests.</p>;
  }

  if (!data?.length) {
    return (
      <p className="text-muted-foreground text-sm">
        No service requests yet. Browse the catalog to submit one.
      </p>
    );
  }

  return (
    <Tabs value={tab} onValueChange={setTab} className="animate-in-up">
      <TabsList>
        <TabsTrigger value="all">All</TabsTrigger>
        <TabsTrigger value="submitted">Submitted</TabsTrigger>
      </TabsList>
      <TabsContent value="all" className="mt-4">
        <RequestsDataTable rows={data} />
      </TabsContent>
      <TabsContent value="submitted" className="mt-4">
        <RequestsDataTable rows={submitted} />
      </TabsContent>
    </Tabs>
  );
}
