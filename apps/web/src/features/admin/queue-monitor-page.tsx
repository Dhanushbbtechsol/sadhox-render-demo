import { AlertTriangleIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch, getAccessToken, isMockAccessToken } from "@/lib/api";
import { cn } from "@/lib/utils";

import { useQueueHealth } from "./hooks";

type ReadyProbe = {
  status: string;
  database?: string;
  redis?: string;
};

export default function QueueMonitorPage() {
  const health = useQueueHealth();
  const ready = useQuery({
    queryKey: ["health", "ready", isMockAccessToken(getAccessToken()) ? "mock" : "live"],
    queryFn: async (): Promise<ReadyProbe | null> => {
      if (import.meta.env.DEV && isMockAccessToken(getAccessToken())) {
        return { status: "ok", database: "up", redis: "up" };
      }
      try {
        return await apiFetch<ReadyProbe>("/health/ready");
      } catch (error) {
        if (import.meta.env.DEV) {
          return { status: "degraded", database: "up", redis: "down" };
        }
        throw error;
      }
    },
    refetchInterval: 15_000,
  });

  const redisDown = ready.data?.redis === "down" || ready.isError;
  const showAlert = Boolean(health.data?.alert || redisDown);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Worker queues</h1>
        <p className="text-sm text-muted-foreground">
          How many background jobs are waiting, running, finished, or stuck, and
          whether the job system is ready.
        </p>
      </div>

      {health.isError ? (
        <div className="border-destructive/40 bg-destructive/10 text-destructive flex items-start gap-3 rounded-xl border p-4 text-sm">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Unable to reach queue monitor</p>
            <p className="opacity-90">
              {health.error instanceof Error
                ? health.error.message
                : "The job system is unavailable."}
            </p>
          </div>
        </div>
      ) : null}

      {showAlert ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-950 dark:text-amber-100">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Queue alert</p>
            <p className="opacity-90">
              {redisDown
                ? "The job system is not ready, so background work may be stuck."
                : "One or more queues have failed or stuck jobs, or are paused."}
            </p>
          </div>
        </div>
      ) : null}

      {health.isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : null}

      {health.data ? (
        <div className="grid gap-4 md:grid-cols-3">
          {health.data.queues.map((queue) => (
            <section
              key={queue.name}
              className={cn(
                "bg-card ring-foreground/10 flex flex-col gap-3 rounded-xl p-5 ring-1",
                queue.alert && "ring-amber-500/50",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold tracking-tight">{queue.name}</h2>
                {queue.alert ? (
                  <span className="rounded bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200">
                    Alert
                  </span>
                ) : (
                  <span className="text-muted-foreground rounded bg-muted px-2 py-0.5 text-xs">
                    OK
                  </span>
                )}
              </div>
              {queue.error ? (
                <p className="text-destructive text-xs">{queue.error}</p>
              ) : null}
              {queue.paused ? (
                <p className="text-amber-700 text-xs dark:text-amber-300">Queue is paused</p>
              ) : null}
              <dl className="grid grid-cols-2 gap-2 text-sm">
                {(
                  [
                    ["Active", queue.counts.active],
                    ["Waiting", queue.counts.waiting],
                    ["Completed", queue.counts.completed],
                    ["Failed", queue.counts.failed],
                    ["Stalled", queue.counts.stalled ?? 0],
                    ["Delayed", queue.counts.delayed],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-2">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd
                      className={cn(
                        "font-medium tabular-nums",
                        (label === "Failed" || label === "Stalled") &&
                          value > 0 &&
                          "text-destructive",
                      )}
                    >
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}
