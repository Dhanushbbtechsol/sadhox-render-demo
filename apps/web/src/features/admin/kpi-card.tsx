import { Minus, TrendingDown, TrendingUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { KpiMetric } from "./types";

const trendIcon = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
} as const;

export function KpiCard({ metric }: { metric: KpiMetric }) {
  const Icon = trendIcon[metric.trend];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{metric.label}</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <p className="text-2xl font-semibold tracking-tight">{metric.value}</p>
        <p
          className={cn(
            "mt-1 flex items-center gap-1 text-xs",
            metric.trend === "up" && "text-emerald-600 dark:text-emerald-400",
            metric.trend === "down" && "text-amber-600 dark:text-amber-400",
            metric.trend === "flat" && "text-muted-foreground",
          )}
        >
          <Icon className="size-3.5" />
          {metric.delta}
        </p>
      </CardContent>
    </Card>
  );
}
