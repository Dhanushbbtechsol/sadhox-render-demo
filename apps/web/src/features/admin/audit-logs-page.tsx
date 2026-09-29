import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { useAuditLogs } from "./hooks";
import type { AuditLog } from "./types";

const ACTOR_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function AuditLogsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [actorId, setActorId] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const actorIdFilter = ACTOR_UUID_RE.test(actorId.trim()) ? actorId.trim() : undefined;

  const logs = useAuditLogs({
    actorId: actorIdFilter,
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
          Timeline of mutating API actions with request/response JSON diffs.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Actor ID</span>
          <Input
            placeholder="UUID of actor"
            value={actorId}
            className="min-w-[18rem]"
            onChange={(e) => {
              setPage(1);
              setActorId(e.target.value);
            }}
          />
        </label>
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
            setActorId("");
            setFrom("");
            setTo("");
            setPage(1);
          }}
        >
          Clear filters
        </Button>
      </div>
      {actorId.trim() && !actorIdFilter ? (
        <p className="text-muted-foreground text-xs">
          Enter a full actor UUID to filter; partial values are ignored until valid.
        </p>
      ) : null}

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
              <AuditTimelineItem
                key={entry.id}
                entry={entry}
                expanded={expandedId === entry.id}
                onToggle={() =>
                  setExpandedId((current) => (current === entry.id ? null : entry.id))
                }
              />
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

function AuditTimelineItem({
  entry,
  expanded,
  onToggle,
}: {
  entry: AuditLog;
  expanded: boolean;
  onToggle: () => void;
}) {
  const beforeAfter = splitDiff(entry.diff);

  return (
    <li className="relative mb-4 last:mb-0">
      <span className="bg-primary absolute -start-[1.9rem] mt-1.5 size-3 rounded-full ring-4 ring-background" />
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "bg-card ring-foreground/10 w-full rounded-xl p-4 text-left ring-1 transition-colors",
          expanded ? "ring-primary/40" : "hover:bg-muted/40",
        )}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-medium">{entry.action}</p>
          <time className="text-muted-foreground text-xs">
            {new Date(entry.createdAt).toLocaleString()}
          </time>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          {entry.actor}
          {entry.actorId ? ` (${entry.actorId})` : ""} · {entry.entityType}
          {entry.entityId ? ` · ${entry.entityId}` : ""}
        </p>
      </button>

      {expanded ? (
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          <JsonPanel title="Before (request)" value={beforeAfter.before} />
          <JsonPanel title="After (response)" value={beforeAfter.after} />
        </div>
      ) : null}
    </li>
  );
}

function JsonPanel({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="bg-muted/40 overflow-x-auto rounded-lg p-3">
      <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
        {title}
      </p>
      <pre className="text-xs leading-relaxed whitespace-pre-wrap">
        {value == null ? "—" : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

function splitDiff(diff: unknown): { before: unknown; after: unknown } {
  if (!diff || typeof diff !== "object") {
    return { before: diff ?? null, after: null };
  }
  const record = diff as Record<string, unknown>;
  if ("request" in record || "response" in record) {
    return { before: record.request ?? null, after: record.response ?? null };
  }
  if ("outcome" in record) {
    return { before: null, after: record };
  }
  return { before: record, after: null };
}
