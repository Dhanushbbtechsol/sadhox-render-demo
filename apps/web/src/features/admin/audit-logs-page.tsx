import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useAuditLogs } from "./hooks";

export default function AuditLogsPage() {
  const logs = useAuditLogs();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Audit logs</h1>
        <p className="text-sm text-muted-foreground">
          Recent system actions. This list uses mock records until the audit API is connected.
        </p>
      </div>

      {logs.isLoading ? <Skeleton className="h-48" /> : null}

      {logs.data ? (
        <div className="ring-foreground/10 overflow-x-auto bg-card ring-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Id</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.data.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap">
                    {new Date(entry.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>{entry.actor}</TableCell>
                  <TableCell>{entry.action}</TableCell>
                  <TableCell>{entry.entityType}</TableCell>
                  <TableCell>{entry.entityId}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  );
}
