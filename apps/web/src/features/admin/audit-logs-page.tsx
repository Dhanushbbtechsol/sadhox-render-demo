import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

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
    limit: 25,
  });

  const totalPages = useMemo(() => {
    if (!logs.data) return 1;
    return Math.max(1, Math.ceil(logs.data.total / logs.data.limit));
  }, [logs.data]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Audit logs</h1>
        <p className="text-sm text-muted-foreground">
          A timeline of changes made in the system.
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

          <div className="flex items-center justify-between gap-3">
            <p className="text-muted-foreground text-xs">
              Page {logs.data.page} of {totalPages} · {logs.data.total} events
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AuditTimelineItem({ entry }: { entry: AuditLog }) {
  return (
    <li className="relative mb-4 last:mb-0">
      <span className="bg-primary absolute -start-[1.9rem] mt-1.5 size-3 rounded-full ring-4 ring-background" />
      <div className="bg-card ring-foreground/10 w-full rounded-xl p-4 ring-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-medium">{entry.action}</p>
          <time className="text-muted-foreground text-xs">
            {new Date(entry.createdAt).toLocaleString()}
          </time>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          {entry.actor} · {entry.entityType}
        </p>
      </div>
    </li>
  );
}
