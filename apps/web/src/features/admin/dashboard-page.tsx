import { useState } from "react";
import { DownloadIcon, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

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
import { cn } from "@/lib/utils";

import { buildDashboardCsv, downloadDashboardCsv } from "./export-dashboard-csv";
import {
  useAdminStats,
  useChartSlaCompliance,
  useChartStatusDistribution,
  useChartVolumeByModule,
} from "./hooks";
import { KpiCard } from "./kpi-card";
import type { ChartRange } from "./types";

const RANGE_OPTIONS: { value: ChartRange; label: string }[] = [
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "ytd", label: "Year-to-Date" },
];

const slaChartConfig = {
  met: {
    label: "SLA met",
    color: "var(--chart-sla-met)",
  },
  breached: {
    label: "Breached",
    color: "var(--chart-sla-breached)",
  },
} satisfies ChartConfig;

const volumeChartConfig = {
  open: {
    label: "Open",
    color: "var(--chart-open)",
  },
  closed: {
    label: "Closed",
    color: "var(--chart-closed)",
  },
} satisfies ChartConfig;

const DONUT_COLORS = [
  "#1A16F3",
  "#6366f1",
  "#0ea5e9",
  "#14b8a6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#64748b",
];

export default function DashboardPage() {
  const [range, setRange] = useState<ChartRange>("30d");
  const stats = useAdminStats();
  const volume = useChartVolumeByModule(range);
  const statusDist = useChartStatusDistribution(range);
  const slaRate = useChartSlaCompliance(range);

  function handleExportCsv() {
    if (!stats.data || !slaRate.data) {
      toast.error("Dashboard data is still loading");
      return;
    }
    const csv = buildDashboardCsv({
      range,
      stats: stats.data,
      slaCompliance: slaRate.data,
    });
    const date = new Date().toISOString().slice(0, 10);
    downloadDashboardCsv(`sadhox-dashboard-${range}-${date}.csv`, csv);
    toast.success("CSV downloaded");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Executive dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Interactive charts from Nest admin aggregates with date-range filters.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleExportCsv}
            disabled={!stats.data || !slaRate.data}
          >
            <DownloadIcon />
            Export CSV
          </Button>
        </div>
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
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.data.kpis.map((metric) => (
            <KpiCard key={metric.id} metric={metric} />
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="bg-card ring-foreground/10 flex flex-col gap-4 rounded-xl p-5 ring-1 xl:col-span-2">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Ticket volume by module</h2>
            <p className="text-muted-foreground text-sm">Stacked open vs closed for {rangeLabel(range)}</p>
          </div>
          {volume.isLoading ? <Skeleton className="h-72" /> : null}
          {volume.data ? (
            <ChartContainer config={volumeChartConfig} className="aspect-auto h-72 w-full">
              <BarChart data={volume.data.data} accessibilityLayer>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="module" tickLine={false} axisLine={false} tickMargin={10} />
                <YAxis tickLine={false} axisLine={false} width={36} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="open" stackId="vol" fill="var(--color-open)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="closed" stackId="vol" fill="var(--color-closed)" radius={[4, 4, 0, 0]} />
                <ChartLegend content={<ChartLegendContent />} />
              </BarChart>
            </ChartContainer>
          ) : null}
        </section>

        <section className="bg-card ring-foreground/10 flex flex-col gap-4 rounded-xl p-5 ring-1">
          <div>
            <h2 className="text-base font-semibold tracking-tight">SLA compliance</h2>
            <p className="text-muted-foreground text-sm">Resolved incidents in range</p>
          </div>
          {slaRate.isLoading ? <Skeleton className="h-40" /> : null}
          {slaRate.data ? <SlaGauge rate={slaRate.data.rate} met={slaRate.data.met} breached={slaRate.data.breached} /> : null}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="bg-card ring-foreground/10 flex flex-col gap-4 rounded-xl p-5 ring-1">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Status distribution</h2>
            <p className="text-muted-foreground text-sm">Donut of ticket statuses in {rangeLabel(range)}</p>
          </div>
          {statusDist.isLoading ? <Skeleton className="h-72" /> : null}
          {statusDist.data && statusDist.data.data.length > 0 ? (
            <ChartContainer
              config={Object.fromEntries(
                statusDist.data.data.map((row, index) => [
                  row.status,
                  { label: `${row.module} · ${row.label}`, color: DONUT_COLORS[index % DONUT_COLORS.length] },
                ]),
              )}
              className="aspect-auto mx-auto h-72 w-full max-w-md"
            >
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="status" hideLabel />} />
                <Pie
                  data={statusDist.data.data}
                  dataKey="count"
                  nameKey="status"
                  innerRadius={58}
                  outerRadius={92}
                  strokeWidth={2}
                >
                  {statusDist.data.data.map((row, index) => (
                    <Cell key={row.status} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                  ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="status" />} />
              </PieChart>
            </ChartContainer>
          ) : statusDist.data ? (
            <p className="text-muted-foreground text-sm">No tickets in this range.</p>
          ) : null}
        </section>

        <section className="bg-card ring-foreground/10 flex flex-col gap-4 rounded-xl p-5 ring-1">
          <div>
            <h2 className="text-base font-semibold tracking-tight">SLA performance</h2>
            <p className="text-muted-foreground text-sm">Weekly met vs breached (all time sample)</p>
          </div>
          {stats.isLoading ? <Skeleton className="h-72" /> : null}
          {stats.data && stats.data.slaPerformance.length > 0 ? (
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
          ) : stats.data ? (
            <p className="text-muted-foreground text-sm">No resolved SLA samples yet.</p>
          ) : null}
          <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <TrendingUp className="size-3.5" />
            Based on resolved incidents with an SLA due date
          </p>
        </section>
      </div>

      {stats.data ? (
        <div className="grid gap-4 md:grid-cols-2">
          <CountList title="By priority" rows={stats.data.ticketsByPriority} />
          <CountList title="By module" rows={stats.data.ticketsByModule} />
        </div>
      ) : null}
    </div>
  );
}

function SlaGauge({
  rate,
  met,
  breached,
}: {
  rate: number;
  met: number;
  breached: number;
}) {
  const clamped = Math.max(0, Math.min(100, rate));
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <p className="text-4xl font-semibold tracking-tight tabular-nums">{clamped}%</p>
        <p className="text-muted-foreground text-sm">
          {met} met · {breached} breached
        </p>
      </div>
      <div
        className="bg-muted h-3 w-full overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="SLA compliance rate"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width]",
            clamped >= 90 ? "bg-emerald-500" : clamped >= 75 ? "bg-amber-500" : "bg-red-500",
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
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

function rangeLabel(range: ChartRange) {
  return RANGE_OPTIONS.find((o) => o.value === range)?.label ?? range;
}
