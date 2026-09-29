import { TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";

import { useAdminStats } from "./hooks";
import { KpiCard } from "./kpi-card";

/** Soft brand blue — Bklit-style muted series fill (see bklit.com charts). */
const slaChartConfig = {
  met: {
    label: "SLA met",
    color: "color-mix(in srgb, #1A16F3 55%, white)",
  },
  breached: {
    label: "Breached",
    color: "color-mix(in srgb, #ef4444 45%, white)",
  },
} satisfies ChartConfig;

export default function DashboardPage() {
  const stats = useAdminStats();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Executive dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Ticket volume by status, priority, and module from live Nest aggregates.
        </p>
      </div>

      {stats.isError ? (
        <p className="text-destructive text-sm">
          {stats.error instanceof Error ? stats.error.message : "Failed to load dashboard"}
        </p>
      ) : null}

      {stats.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
      ) : null}

      {stats.data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.data.kpis.map((metric) => (
              <KpiCard key={metric.id} metric={metric} />
            ))}
          </div>

          <section className="bg-card ring-foreground/10 flex flex-col gap-4 rounded-xl p-5 ring-1 md:p-6">
            <div>
              <h2 className="text-base font-semibold tracking-tight">SLA performance</h2>
              <p className="text-muted-foreground text-sm">
                Weekly met vs breached incidents over the last two months
              </p>
            </div>
            {stats.data.slaPerformance.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No resolved SLA samples yet. Run{" "}
                <code className="text-xs">pnpm --filter server db:seed</code> for showcase data.
              </p>
            ) : (
              <ChartContainer config={slaChartConfig} className="aspect-auto h-72 w-full">
                <AreaChart
                  data={stats.data.slaPerformance}
                  accessibilityLayer
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="fillMet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-met)" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="var(--color-met)" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="fillBreached" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-breached)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--color-breached)" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    className="text-xs"
                  />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                  <Area
                    dataKey="breached"
                    type="natural"
                    fill="url(#fillBreached)"
                    stroke="var(--color-breached)"
                    strokeWidth={2}
                    stackId="sla"
                  />
                  <Area
                    dataKey="met"
                    type="natural"
                    fill="url(#fillMet)"
                    stroke="var(--color-met)"
                    strokeWidth={2}
                    stackId="sla"
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                </AreaChart>
              </ChartContainer>
            )}
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <TrendingUp className="size-3.5" />
              Based on resolved incidents with an SLA due date
            </p>
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <CountList title="By priority" rows={stats.data.ticketsByPriority} />
            <CountList title="By module" rows={stats.data.ticketsByModule} />
          </div>
        </>
      ) : null}
    </div>
  );
}

function CountList({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; count: number }[];
}) {
  return (
    <section className="bg-card ring-foreground/10 flex flex-col gap-3 rounded-xl p-5 ring-1">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      <ul className="flex flex-col gap-2.5 text-sm">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">{row.label}</span>
            <span className="font-medium tabular-nums">{row.count}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
