import { useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/features/admin/kpi-card";
import type { ChartRange } from "@/features/admin/types";
import {
  useManagerCharts,
  useManagerDashboardStats,
} from "@/features/projects/hooks";

const RANGE_OPTIONS: { value: ChartRange; label: string }[] = [
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "ytd", label: "Year-to-Date" },
];

const volumeChartConfig = {
  open: { label: "Open", color: "var(--chart-1)" },
  closed: { label: "Closed", color: "var(--chart-2)" },
} satisfies ChartConfig;

export default function ManagerHomePage() {
  const stats = useManagerDashboardStats();
  const [range, setRange] = useState<ChartRange>("30d");
  const charts = useManagerCharts(range);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Manager home</h1>
          <p className="text-muted-foreground text-sm">
            KPIs and charts for projects you own. Scope comes from the API, not
            a client-side hide of the admin dashboard.
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {RANGE_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={range === option.value ? "default" : "outline"}
              onClick={() => setRange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {stats.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : null}

      {stats.isError ? (
        <p className="text-destructive text-sm">
          {stats.error instanceof Error
            ? stats.error.message
            : "Failed to load manager dashboard"}
        </p>
      ) : null}

      {stats.data ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.data.kpis.map((kpi) => (
            <KpiCard key={kpi.id} metric={kpi} />
          ))}
        </div>
      ) : null}

      <section className="bg-card ring-foreground/10 flex min-w-0 flex-col gap-4 overflow-hidden rounded-xl p-5 ring-1">
        <div>
          <h2 className="text-base font-semibold tracking-tight">
            Ticket volume by module
          </h2>
          <p className="text-muted-foreground text-sm">
            Open vs closed in owned projects
            {charts.data
              ? ` · SLA ${charts.data.sla.rate}% (${charts.data.sla.met} met / ${charts.data.sla.breached} breached)`
              : ""}
          </p>
        </div>
        {charts.isLoading ? <Skeleton className="h-64" /> : null}
        {charts.isError ? (
          <p className="text-destructive text-sm">
            {charts.error instanceof Error
              ? charts.error.message
              : "Failed to load charts"}
          </p>
        ) : null}
        {charts.data ? (
          <ChartContainer
            config={volumeChartConfig}
            className="aspect-auto h-64 w-full min-w-0"
          >
            <BarChart data={charts.data.volume} accessibilityLayer>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="module"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
              />
              <YAxis tickLine={false} axisLine={false} width={36} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="open"
                stackId="vol"
                fill="var(--color-open)"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="closed"
                stackId="vol"
                fill="var(--color-closed)"
                radius={[4, 4, 0, 0]}
              />
              <ChartLegend content={<ChartLegendContent />} />
            </BarChart>
          </ChartContainer>
        ) : null}
      </section>
    </div>
  );
}
