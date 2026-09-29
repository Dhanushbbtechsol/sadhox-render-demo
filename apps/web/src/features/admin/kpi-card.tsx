import {
  AlertTriangle,
  CheckCircle2,
  FolderOpen,
  Minus,
  Ticket,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

import type { KpiMetric } from "./types";

const trendIcon = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
} as const;

const metricVisual: Record<
  string,
  {
    icon: LucideIcon;
    tone: string;
  }
> = {
  total: {
    icon: Ticket,
    tone: "bg-gradient-to-br from-[#3D29D0] to-[#C25FFF] text-white shadow-[0_6px_16px_-4px_rgba(61,41,208,0.45)]",
  },
  open: {
    icon: FolderOpen,
    tone: "bg-gradient-to-br from-sky-500 to-cyan-400 text-white shadow-[0_6px_16px_-4px_rgba(14,165,233,0.4)]",
  },
  p1: {
    icon: AlertTriangle,
    tone: "bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-[0_6px_16px_-4px_rgba(245,158,11,0.4)]",
  },
  sla: {
    icon: CheckCircle2,
    tone: "bg-gradient-to-br from-emerald-500 to-teal-400 text-white shadow-[0_6px_16px_-4px_rgba(16,185,129,0.4)]",
  },
};

const fallbackVisual = {
  icon: Ticket,
  tone: "bg-gradient-to-br from-[#3D29D0] to-[#C25FFF] text-white shadow-[0_6px_16px_-4px_rgba(61,41,208,0.45)]",
};

export function KpiCard({ metric }: { metric: KpiMetric }) {
  const TrendIcon = trendIcon[metric.trend];
  const visual = metricVisual[metric.id] ?? fallbackVisual;
  const MetricIcon = visual.icon;

  return (
    <div
      className={cn(
        "border-border/80 bg-card group rounded-xl border p-4 shadow-soft",
        "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {metric.label}
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
            {metric.value}
          </p>
          <p
            className={cn(
              "mt-1.5 flex items-center gap-1 text-xs",
              metric.trend === "up" && "text-emerald-600 dark:text-emerald-400",
              metric.trend === "down" && "text-amber-600 dark:text-amber-400",
              metric.trend === "flat" && "text-muted-foreground",
            )}
          >
            <TrendIcon className="size-3.5 shrink-0" />
            <span className="truncate">{metric.delta}</span>
          </p>
        </div>
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            "transition-transform duration-200 group-hover:scale-110",
            visual.tone,
          )}
        >
          <MetricIcon className="size-5" strokeWidth={2.25} />
        </span>
      </div>
    </div>
  );
}
