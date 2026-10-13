import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClockIcon,
  MailIcon,
  RefreshCwIcon,
  TimerIcon,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch, getAccessToken, isMockAccessToken } from "@/lib/api";
import { cn } from "@/lib/utils";

import { useQueueHealth } from "./hooks";
import type { QueueHealthRow } from "./types";

type ReadyProbe = {
  status: string;
  database?: string;
  redis?: string;
};

/** Fallback titles when an older API omits `title`. */
const FALLBACK_TITLE: Record<string, string> = {
  "sla-queue": "Response time checks",
  "ticket-lifecycle-queue": "Ticket auto-close",
  "email-queue": "Email sending",
};

const FALLBACK_PURPOSE: Record<string, string> = {
  "sla-queue":
    "Checks tickets every 5 minutes for missed response times and emails the right people.",
  "ticket-lifecycle-queue":
    "Auto-closes tickets that stay Resolved long enough with no further action.",
  "email-queue":
    "Sends the emails the app queues (assignments, approvals, alerts).",
};

function queueTitle(queue: QueueHealthRow) {
  return queue.title || FALLBACK_TITLE[queue.name] || queue.name;
}

function queuePurpose(queue: QueueHealthRow) {
  return queue.purpose || FALLBACK_PURPOSE[queue.name] || "";
}

function QueueIcon({ name }: { name: string }) {
  const className = "size-4 shrink-0 text-muted-foreground";
  if (name.includes("email")) return <MailIcon className={className} />;
  if (name.includes("lifecycle") || name.includes("ticket"))
    return <TimerIcon className={className} />;
  return <ClockIcon className={className} />;
}

function statusLabel(queue: QueueHealthRow): {
  label: string;
  tone: "ok" | "warn" | "bad";
} {
  if (queue.error) return { label: "Unavailable", tone: "bad" };
  if (queue.paused) return { label: "Paused", tone: "warn" };
  if ((queue.counts.failed ?? 0) > 0 || (queue.counts.stalled ?? 0) > 0) {
    return { label: "Needs attention", tone: "warn" };
  }
  if ((queue.counts.active ?? 0) > 0 || (queue.counts.waiting ?? 0) > 0) {
    return { label: "Working", tone: "ok" };
  }
  return { label: "Idle", tone: "ok" };
}

function Stat({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: number;
  emphasize?: "bad" | "muted";
}) {
  return (
    <div className="rounded-md bg-muted/40 px-3 py-2">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-lg font-semibold tabular-nums",
          emphasize === "bad" && value > 0 && "text-destructive",
          emphasize === "muted" && "text-muted-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function QueueCard({ queue }: { queue: QueueHealthRow }) {
  const status = statusLabel(queue);
  const purpose = queuePurpose(queue);
  const failed = queue.counts.failed ?? 0;
  const stalled = queue.counts.stalled ?? 0;

  return (
    <section
      className={cn(
        "bg-card ring-foreground/10 flex flex-col gap-4 rounded-xl p-5 ring-1",
        queue.alert && "ring-amber-500/40",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <QueueIcon name={queue.name} />
          <div className="min-w-0">
            <h2 className="font-semibold tracking-tight">{queueTitle(queue)}</h2>
            {purpose ? (
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                {purpose}
              </p>
            ) : null}
          </div>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-md px-2 py-0.5 text-xs font-medium",
            status.tone === "ok" && "bg-muted text-muted-foreground",
            status.tone === "warn" &&
              "bg-amber-500/15 text-amber-900 dark:text-amber-100",
            status.tone === "bad" && "bg-destructive/15 text-destructive",
          )}
        >
          {status.label}
        </span>
      </div>

      {queue.error ? (
        <p className="text-destructive text-sm">{queue.error}</p>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Running now" value={queue.counts.active ?? 0} />
        <Stat label="Waiting" value={queue.counts.waiting ?? 0} />
        <Stat label="Failed" value={failed} emphasize="bad" />
        <Stat
          label="Finished"
          value={queue.counts.completed ?? 0}
          emphasize="muted"
        />
      </div>

      {(stalled > 0 || (queue.counts.delayed ?? 0) > 0) && (
        <p className="text-muted-foreground text-xs">
          {stalled > 0 ? `${stalled} stuck job${stalled === 1 ? "" : "s"}` : null}
          {stalled > 0 && (queue.counts.delayed ?? 0) > 0 ? " · " : null}
          {(queue.counts.delayed ?? 0) > 0
            ? `${queue.counts.delayed} delayed`
            : null}
        </p>
      )}

      {queue.lastFailure ? (
        <div className="border-destructive/20 bg-destructive/5 space-y-1 rounded-lg border p-3 text-sm">
          <p className="text-destructive font-medium">Latest failure</p>
          <p className="text-foreground">{queue.lastFailure.reason}</p>
          <p className="text-muted-foreground text-xs">
            {queue.lastFailure.jobName} ·{" "}
            {new Date(queue.lastFailure.failedAt).toLocaleString()}
          </p>
        </div>
      ) : failed === 0 ? (
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <CheckCircle2Icon className="size-3.5" />
          No recent failures
        </p>
      ) : null}
    </section>
  );
}

export default function QueueMonitorPage() {
  const health = useQueueHealth();
  const ready = useQuery({
    queryKey: [
      "health",
      "ready",
      isMockAccessToken(getAccessToken()) ? "mock" : "live",
    ],
    queryFn: async (): Promise<ReadyProbe | null> => {
      if (import.meta.env.DEV && isMockAccessToken(getAccessToken())) {
        return { status: "ok", database: "up", redis: "up" };
      }
      return apiFetch<ReadyProbe>("/health/ready");
    },
    refetchInterval: 15_000,
  });

  const redisDown = ready.data?.redis === "down" || ready.isError;
  const needsAttention = Boolean(health.data?.alert || redisDown);
  const allClear =
    health.isSuccess && !needsAttention && !health.isError && !redisDown;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Background jobs
          </h1>
          <p className="text-muted-foreground text-sm">
            Automatic work that runs behind the scenes — response-time checks,
            auto-close, and email. You only need this page when something is
            stuck or failing.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          disabled={health.isFetching}
          onClick={() => void health.refetch()}
        >
          <RefreshCwIcon
            className={cn(health.isFetching && "animate-spin")}
          />
          Refresh
        </Button>
      </div>

      {health.isError ? (
        <div className="border-destructive/40 bg-destructive/10 text-destructive flex items-start gap-3 rounded-xl border p-4 text-sm">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Could not load background jobs</p>
            <p className="opacity-90">
              {health.error instanceof Error
                ? health.error.message
                : "The job system is unavailable."}
            </p>
          </div>
        </div>
      ) : null}

      {redisDown ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-950 dark:text-amber-100">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Job system offline</p>
            <p className="opacity-90">
              Redis is not ready, so background work may not run until it is
              back up.
            </p>
          </div>
        </div>
      ) : null}

      {!redisDown && needsAttention && health.data ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-950 dark:text-amber-100">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Some jobs need attention</p>
            <p className="opacity-90">
              Look for cards marked “Needs attention” — open the latest failure
              note on that card for the reason.
            </p>
          </div>
        </div>
      ) : null}

      {allClear ? (
        <div className="bg-muted/40 text-muted-foreground flex items-start gap-3 rounded-xl p-4 text-sm">
          <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="text-foreground font-medium">All clear</p>
            <p>No failed, stuck, or paused jobs right now.</p>
          </div>
        </div>
      ) : null}

      {health.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : null}

      {health.data ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {health.data.queues.map((queue) => (
            <QueueCard key={queue.name} queue={queue} />
          ))}
        </div>
      ) : null}

      <p className="text-muted-foreground text-xs">
        Counts refresh automatically every few seconds while this page is open.
        Technical queue names still appear in logs if support needs them.
      </p>
    </div>
  );
}
