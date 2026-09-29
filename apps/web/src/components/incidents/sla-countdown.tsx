import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type SlaTone = "green" | "amber" | "red";

export function slaCountdownState(input: {
  slaDueAt: string | null;
  slaTargetMinutes?: number | null;
  slaBreached?: boolean;
  now?: Date;
}): {
  tone: SlaTone;
  label: string;
  remainingMs: number;
  percentRemaining: number | null;
} {
  const now = input.now ?? new Date();

  if (input.slaBreached) {
    return {
      tone: "red",
      label: "SLA breached",
      remainingMs: 0,
      percentRemaining: 0,
    };
  }

  if (!input.slaDueAt) {
    return {
      tone: "green",
      label: "No SLA",
      remainingMs: Number.POSITIVE_INFINITY,
      percentRemaining: null,
    };
  }

  const due = new Date(input.slaDueAt).getTime();
  const remainingMs = due - now.getTime();

  if (remainingMs <= 0) {
    return {
      tone: "red",
      label: "Breached",
      remainingMs: 0,
      percentRemaining: 0,
    };
  }

  const targetMs =
    input.slaTargetMinutes != null && input.slaTargetMinutes > 0
      ? input.slaTargetMinutes * 60_000
      : null;
  const percentRemaining =
    targetMs != null ? Math.min(100, (remainingMs / targetMs) * 100) : null;

  let tone: SlaTone = "green";
  if (percentRemaining != null) {
    if (percentRemaining < 25) tone = "amber";
    else if (percentRemaining > 50) tone = "green";
    else tone = "amber";
  } else if (remainingMs < 60 * 60_000) {
    tone = "amber";
  }

  return {
    tone,
    label: formatRemaining(remainingMs),
    remainingMs,
    percentRemaining,
  };
}

function formatRemaining(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 48) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h remaining`;
  }
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  if (minutes > 0) return `${minutes}m ${seconds}s remaining`;
  return `${seconds}s remaining`;
}

const toneClass: Record<SlaTone, string> = {
  green:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
  amber:
    "border-amber-500/40 bg-amber-500/15 text-amber-900 dark:text-amber-200",
  red: "border-red-500/40 bg-red-500/15 text-red-800 dark:text-red-300",
};

export function SlaCountdown({
  slaDueAt,
  slaTargetMinutes,
  slaBreached,
  className,
}: {
  slaDueAt: string | null;
  slaTargetMinutes?: number | null;
  slaBreached?: boolean;
  className?: string;
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const state = slaCountdownState({
    slaDueAt,
    slaTargetMinutes,
    slaBreached,
    now,
  });

  return (
    <div
      className={cn(
        "rounded-xl border p-3.5 transition-colors",
        toneClass[state.tone],
        className,
      )}
      data-sla-tone={state.tone}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium tracking-wide uppercase opacity-80">
          SLA countdown
        </p>
        <Badge
          variant={
            state.tone === "red"
              ? "destructive"
              : state.tone === "amber"
                ? "warning"
                : "success"
          }
        >
          {state.tone === "red"
            ? "Breached"
            : state.tone === "amber"
              ? "At risk"
              : "On track"}
        </Badge>
      </div>
      <p className="mt-1.5 text-sm font-semibold tabular-nums">{state.label}</p>
      {slaDueAt ? (
        <p className="mt-1 text-xs opacity-80">
          Due {new Date(slaDueAt).toLocaleString()}
        </p>
      ) : null}
    </div>
  );
}
