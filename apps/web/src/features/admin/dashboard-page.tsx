import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";

import { useAdminStats } from "./hooks";
import { KpiCard } from "./kpi-card";

const statusChartConfig = {
  count: {
    label: "Tickets",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export default function DashboardPage() {
  const stats = useAdminStats();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Executive dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Ticket volume by status, priority, and module. Figures are mock aggregates.
        </p>
      </div>

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

          <section className="ring-foreground/10 bg-card p-4 ring-1">
            <h2 className="mb-4 text-sm font-medium">Tickets by status</h2>
            <ChartContainer config={statusChartConfig} className="h-64 w-full">
              <BarChart data={stats.data.ticketsByStatus} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={0} />
              </BarChart>
            </ChartContainer>
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
    <section className="ring-foreground/10 bg-card p-4 ring-1">
      <h2 className="mb-3 text-sm font-medium">{title}</h2>
      <ul className="flex flex-col gap-2 text-sm">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between">
            <span>{row.label}</span>
            <span className="font-medium tabular-nums">{row.count}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
