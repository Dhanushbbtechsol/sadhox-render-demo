import { useEffect, useMemo, useState } from "react";
import { DownloadIcon, ListFilterIcon, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

import { PieCenter } from "@/components/charts/pie-center";
import { PieChart } from "@/components/charts/pie-chart";
import { PieSlice } from "@/components/charts/pie-slice";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { downloadDashboardReport } from "./export-dashboard-csv";
import {
  useAdminStats,
  useChartSlaCompliance,
  useChartStatusDistribution,
  useChartVolumeByModule,
} from "./hooks";
import { KpiCard } from "./kpi-card";
import type { ChartRange, StatusDistributionRow } from "./types";

const RANGE_OPTIONS: { value: ChartRange; label: string }[] = [
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "ytd", label: "Year-to-Date" },
];

/** How many statuses are selected by default (highest counts first). */
const DEFAULT_STATUS_SERIES_COUNT = 6;

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
  const [reportLoading, setReportLoading] = useState(false);
  const stats = useAdminStats();
  const volume = useChartVolumeByModule(range);
  const statusDist = useChartStatusDistribution(range);
  const slaRate = useChartSlaCompliance(range);

  async function handleGenerateReport() {
    setReportLoading(true);
    try {
      await downloadDashboardReport(range);
      toast.success("Report downloaded");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate report",
      );
    } finally {
      setReportLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Executive dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Charts of tickets, response times, and activity. Change the date range to see a different period.
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
            onClick={handleGenerateReport}
            disabled={reportLoading}
          >
            <DownloadIcon />
            {reportLoading ? "Generating…" : "Generate report"}
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

      <div className="grid gap-4 xl:grid-cols-3 xl:items-start">
        <section className="bg-card ring-foreground/10 flex min-w-0 flex-col gap-4 overflow-hidden rounded-xl p-5 ring-1 xl:col-span-2">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Ticket volume by module</h2>
            <p className="text-muted-foreground text-sm">Open and closed tickets for {rangeLabel(range)}</p>
          </div>
          {volume.isLoading ? <Skeleton className="h-72" /> : null}
          {volume.data ? (
            <ChartContainer config={volumeChartConfig} className="aspect-auto h-64 w-full min-w-0 sm:h-72">
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

        <section className="bg-card ring-foreground/10 flex min-w-0 flex-col gap-4 overflow-hidden rounded-xl p-5 ring-1">
          <div>
            <h2 className="text-base font-semibold tracking-tight">SLA compliance</h2>
            <p className="text-muted-foreground text-sm">Resolved incidents in range</p>
          </div>
          {slaRate.isLoading ? <Skeleton className="h-40" /> : null}
          {slaRate.data ? <SlaGauge rate={slaRate.data.rate} met={slaRate.data.met} breached={slaRate.data.breached} /> : null}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <StatusDistributionCard
          range={range}
          isLoading={statusDist.isLoading}
          rows={statusDist.data?.data}
          hasData={Boolean(statusDist.data)}
        />

        <section className="bg-card ring-foreground/10 flex min-w-0 flex-col gap-4 overflow-hidden rounded-xl p-5 ring-1">
          <div>
            <h2 className="text-base font-semibold tracking-tight">SLA performance</h2>
            <p className="text-muted-foreground text-sm">Tickets that met or missed the deadline, by week</p>
          </div>
          {stats.isLoading ? <Skeleton className="h-72" /> : null}
          {stats.data && stats.data.slaPerformance.length > 0 ? (
            <ChartContainer config={slaChartConfig} className="aspect-auto h-56 w-full min-w-0 sm:h-72">
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
            <p className="text-muted-foreground text-sm">No resolved tickets with a deadline yet.</p>
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

function defaultStatusKeys(rows: StatusDistributionRow[]) {
  return [...rows]
    .sort((a, b) => b.count - a.count)
    .slice(0, DEFAULT_STATUS_SERIES_COUNT)
    .map((row) => row.status);
}

function StatusDistributionCard({
  range,
  isLoading,
  rows,
  hasData,
}: {
  range: ChartRange;
  isLoading: boolean;
  rows?: StatusDistributionRow[];
  hasData: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [initializedFor, setInitializedFor] = useState<string | null>(null);

  const dataKey = useMemo(
    () => (rows?.length ? `${range}:${rows.map((r) => r.status).join("|")}` : null),
    [range, rows],
  );

  useEffect(() => {
    if (!rows?.length || !dataKey || initializedFor === dataKey) return;
    setSelected(new Set(defaultStatusKeys(rows)));
    setInitializedFor(dataKey);
  }, [rows, dataKey, initializedFor]);

  const colorByStatus = useMemo(() => {
    const map = new Map<string, string>();
    (rows ?? []).forEach((row, index) => {
      map.set(row.status, DONUT_COLORS[index % DONUT_COLORS.length]);
    });
    return map;
  }, [rows]);

  const visibleRows = useMemo(
    () => (rows ?? []).filter((row) => selected.has(row.status)),
    [rows, selected],
  );

  const pieData = useMemo(
    () =>
      visibleRows.map((row) => ({
        label: `${row.module} · ${row.label}`,
        value: row.count,
        color: colorByStatus.get(row.status),
      })),
    [visibleRows, colorByStatus],
  );

  function toggleStatus(status: string, next: boolean) {
    setSelected((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(status);
      else copy.delete(status);
      return copy;
    });
  }

  function selectAll() {
    setSelected(new Set((rows ?? []).map((row) => row.status)));
  }

  function resetDefaults() {
    if (!rows?.length) return;
    setSelected(new Set(defaultStatusKeys(rows)));
  }

  return (
    <section className="bg-card ring-foreground/10 flex min-w-0 flex-col gap-4 overflow-hidden rounded-xl p-5 ring-1">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight">Status distribution</h2>
          <p className="text-muted-foreground text-sm">
            How tickets are split by status for {rangeLabel(range)}
          </p>
        </div>
        {rows && rows.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                />
              }
            >
              <ListFilterIcon className="size-3.5" />
              Customize
              <span className="text-muted-foreground tabular-nums">
                {selected.size}/{rows.length}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72" sideOffset={6}>
              <DropdownMenuGroup>
                <DropdownMenuLabel>Show in chart</DropdownMenuLabel>
                <div className="max-h-56 overflow-y-auto">
                  {rows.map((row) => (
                    <DropdownMenuCheckboxItem
                      key={row.status}
                      checked={selected.has(row.status)}
                      onCheckedChange={(checked) =>
                        toggleStatus(row.status, Boolean(checked))
                      }
                    >
                      <span
                        className="size-2.5 shrink-0 rounded-[2px]"
                        style={{ backgroundColor: colorByStatus.get(row.status) }}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {row.module} · {row.label}
                      </span>
                      <span className="text-muted-foreground tabular-nums">
                        {row.count}
                      </span>
                    </DropdownMenuCheckboxItem>
                  ))}
                </div>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={selectAll}>Select all</DropdownMenuItem>
              <DropdownMenuItem onClick={resetDefaults}>
                Reset to top {DEFAULT_STATUS_SERIES_COUNT}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      {isLoading ? <Skeleton className="h-56" /> : null}

      {rows && rows.length > 0 ? (
        visibleRows.length > 0 ? (
          <div className="flex min-w-0 flex-col gap-4">
            <div className="mx-auto aspect-square h-52 w-full max-w-[13rem] sm:h-56 sm:max-w-[14rem]">
              <PieChart
                data={pieData}
                innerRadius={56}
                padAngle={0.02}
                cornerRadius={4}
                className="mx-auto"
              >
                {pieData.map((slice, index) => (
                  <PieSlice
                    key={slice.label}
                    index={index}
                    hoverEffect="grow"
                    showGlow={false}
                  />
                ))}
                <PieCenter defaultLabel="Tickets" />
              </PieChart>
            </div>
            <ul className="flex max-h-28 min-w-0 flex-wrap justify-center gap-x-3 gap-y-2 overflow-y-auto px-1 text-xs sm:max-h-32">
              {visibleRows.map((row) => (
                <li
                  key={row.status}
                  className="text-muted-foreground flex max-w-full items-center gap-1.5"
                >
                  <span
                    className="size-2.5 shrink-0 rounded-[2px]"
                    style={{ backgroundColor: colorByStatus.get(row.status) }}
                    aria-hidden
                  />
                  <span className="truncate">
                    {row.module} · {row.label}
                  </span>
                  <span className="text-foreground/70 tabular-nums">({row.count})</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            No statuses selected. Use Customize to pick series for the chart.
          </p>
        )
      ) : hasData ? (
        <p className="text-muted-foreground text-sm">No tickets in this range.</p>
      ) : null}
    </section>
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
