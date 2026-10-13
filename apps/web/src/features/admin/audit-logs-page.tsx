import { useMemo, useState } from "react";
import { Link } from "react-router";

import { LIST_PAGE_SIZE, ListPagination } from "@/components/list-pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import {
  formatAuditActorLine,
  formatAuditDiff,
  formatAuditSummary,
} from "./audit-activity";
import { useAuditLogs } from "./hooks";
import type { AuditLog } from "./types";

export default function AuditLogsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const logs = useAuditLogs({
    from: from ? new Date(from).toISOString() : undefined,
    to: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
    page,
    limit: LIST_PAGE_SIZE,
  });

  const totalPages = useMemo(() => {
    if (!logs.data) return 1;
    return Math.max(1, Math.ceil(logs.data.total / logs.data.limit));
  }, [logs.data]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Audit logs</h1>
        <p className="text-sm text-muted-foreground">
          Timeline of who created, updated, or approved records across the
          service desk. Person and operation downloads live under{" "}
          <Link to="/admin/reports" className="text-primary underline-offset-2 hover:underline">
            Reports
          </Link>
          .
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">From</span>
          <Input
            type="date"
            value={from}
            onChange={(e) => {
              setPage(1);
              setFrom(e.target.value);
            }}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">To</span>
          <Input
            type="date"
            value={to}
            onChange={(e) => {
              setPage(1);
              setTo(e.target.value);
            }}
          />
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setFrom("");
            setTo("");
            setPage(1);
          }}
        >
          Clear filters
        </Button>
      </div>

      {logs.isLoading ? <Skeleton className="h-48" /> : null}

      {logs.isError ? (
        <p className="text-destructive text-sm">
          {logs.error instanceof Error ? logs.error.message : "Failed to load audit logs"}
        </p>
      ) : null}

      {logs.data ? (
        <div className="flex flex-col gap-3">
          <ol className="relative ms-3 border-s border-border ps-6">
            {logs.data.data.map((entry) => (
              <AuditTimelineItem key={entry.id} entry={entry} />
            ))}
          </ol>

          {logs.data.data.length === 0 ? (
            <p className="text-muted-foreground text-sm">No audit events for this filter.</p>
          ) : null}

          <ListPagination
            page={page}
            totalPages={totalPages}
            total={logs.data.total}
            onPageChange={setPage}
            label="events"
          />
        </div>
      ) : null}
    </div>
  );
}

function AuditTimelineItem({ entry }: { entry: AuditLog }) {
  const diffLines = formatAuditDiff(entry.diff);
  return (
    <li className="relative mb-4 last:mb-0">
      <span className="bg-primary absolute -start-[1.9rem] mt-1.5 size-3 rounded-full ring-4 ring-background" />
      <div className="bg-card ring-foreground/10 w-full rounded-xl p-4 ring-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-medium">{formatAuditSummary(entry)}</p>
          <time className="text-muted-foreground text-xs">
            {new Date(entry.createdAt).toLocaleString()}
          </time>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          Performed by {formatAuditActorLine(entry)}
        </p>
        {diffLines.length > 0 ? (
          <ul className="text-muted-foreground mt-2 space-y-0.5 font-mono text-xs">
            {diffLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </li>
  );
}
