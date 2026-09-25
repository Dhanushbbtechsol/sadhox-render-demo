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
  if (status === "Approved" || status === "Fulfilled") return "default" as const;
  if (status === "Rejected") return "destructive" as const;
  return "secondary" as const;
}

function RequestsDataTable({ rows }: { rows: ServiceRequest[] }) {
  if (!rows.length) {
    return <p className="text-muted-foreground text-sm">No service requests in this view.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Service</TableHead>
          <TableHead>Requester</TableHead>
          <TableHead>Urgency</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((request) => (
          <TableRow key={request.id}>
            <TableCell className="font-mono text-xs">{request.id}</TableCell>
            <TableCell>{request.catalogName}</TableCell>
            <TableCell>{request.requesterName}</TableCell>
            <TableCell>
              <Badge variant="outline">{request.urgency}</Badge>
            </TableCell>
            <TableCell>
              <Badge variant={statusVariant(request.status)}>{request.status}</Badge>
            </TableCell>
            <TableCell>{new Date(request.createdAt).toLocaleString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
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
    return <Skeleton className="h-48 w-full" />;
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
    <Tabs value={tab} onValueChange={setTab}>
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
