import type { DeskReport } from "./types";

const RANGE_LABELS: Record<DeskReport["range"], string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  ytd: "Year to date",
};

const STATUS_LABELS: Record<string, string> = {
  New: "New",
  Assigned: "Assigned",
  InProgress: "In Progress",
  Resolved: "Resolved",
  Closed: "Closed",
  Draft: "Draft",
  Submitted: "Submitted",
  PendingApproval: "Pending Approval",
  Approved: "Approved",
  Rejected: "Rejected",
  InFulfillment: "In Fulfillment",
  Fulfilled: "Fulfilled",
  Scheduled: "Scheduled",
  Implementing: "Implementing",
  Implemented: "Implemented",
  Completed: "Completed",
  Failed: "Failed",
  RolledBack: "Rolled Back",
  Cancelled: "Cancelled",
};

function humanLabel(value: string) {
  return STATUS_LABELS[value] ?? value.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function formatGeneratedAt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function percent(part: number, total: number) {
  if (total <= 0) return "0.0%";
  return `${((part / total) * 100).toFixed(1)}%`;
}

function reportRef(report: DeskReport) {
  const day = report.generatedAt.slice(0, 10).replace(/-/g, "");
  return `DSK-${report.scope === "All" ? "ORG" : "TEAM"}-${report.range.toUpperCase()}-${day}`;
}

export function DeskReportView({ report }: { report: DeskReport }) {
  const statusTotal = report.byStatus.reduce((sum, row) => sum + row.count, 0);
  const priorityTotal = report.byPriority.reduce(
    (sum, row) => sum + row.count,
    0,
  );
  const categoryTotal = report.byCategory.reduce(
    (sum, row) => sum + row.count,
    0,
  );
  const slaTotal = report.sla.met + report.sla.breached;
  const compliance = Math.max(0, Math.min(100, report.sla.rate));

  return (
    <article className="bg-background text-foreground mx-auto w-full max-w-3xl space-y-6 text-sm">
      {/* Report banner */}
      <div className="bg-primary text-primary-foreground rounded-lg px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] uppercase opacity-90">
              Yukti Service Desk · ITSM
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
              Operations Desk Report
            </h2>
          </div>
          <div className="rounded-md bg-white/10 px-3 py-2 text-right text-[11px]">
            <p className="font-semibold tracking-wide uppercase opacity-90">
              Document ID
            </p>
            <p className="mt-0.5 font-mono text-xs font-semibold tabular-nums">
              {reportRef(report)}
            </p>
            <p className="mt-1 opacity-80">Internal use only</p>
          </div>
        </div>
      </div>

      {/* Cover metadata */}
      <section>
        <h3 className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-[0.14em] uppercase">
          1. Report information
        </h3>
        <div className="border-border overflow-hidden rounded-lg border">
          <table className="w-full">
            <tbody>
              <InfoRow label="Report title" value={report.title} />
              <InfoRow
                label="Reporting period"
                value={RANGE_LABELS[report.range]}
              />
              <InfoRow
                label="Scope"
                value={
                  report.scope === "All"
                    ? "Organization — all desks"
                    : "Team — tickets for direct reports"
                }
              />
              <InfoRow
                label="Generated"
                value={formatGeneratedAt(report.generatedAt)}
              />
              <InfoRow label="System of record" value="Yukti ITSM" last />
            </tbody>
          </table>
        </div>
      </section>

      {/* Executive KPI tiles */}
      <section>
        <h3 className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-[0.14em] uppercase">
          2. Executive summary
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <KpiTile
            label="Tickets open"
            value={report.kpis.incidentsOpen}
            hint="Active ticket backlog"
          />
          <KpiTile
            label="Tickets resolved"
            value={report.kpis.incidentsResolved}
            hint="Resolved in period"
          />
          <KpiTile
            label="Service requests open"
            value={report.kpis.serviceRequestsOpen}
            hint="Active request backlog"
          />
          <KpiTile
            label="Service requests approved"
            value={report.kpis.serviceRequestsApproved}
            hint="Approved in period"
          />
        </div>
      </section>

      <BreakdownTable
        index={3}
        title="Volume by status"
        column="Status"
        rows={report.byStatus.map((r) => ({
          label: humanLabel(r.status),
          count: r.count,
        }))}
        total={statusTotal}
      />

      <BreakdownTable
        index={4}
        title="Volume by priority"
        column="Priority"
        rows={report.byPriority.map((r) => ({
          label: r.priority,
          count: r.count,
        }))}
        total={priorityTotal}
      />

      <BreakdownTable
        index={5}
        title="Volume by category"
        column="Category"
        rows={report.byCategory.map((r) => ({
          label: r.category,
          count: r.count,
        }))}
        total={categoryTotal}
      />

      {/* SLA */}
      <section>
        <h3 className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-[0.14em] uppercase">
          6. Response time
        </h3>
        <div className="border-border overflow-hidden rounded-lg border">
          <div className="bg-muted/40 flex flex-wrap items-end justify-between gap-3 border-b px-4 py-4">
            <div>
              <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
                Compliance rate
              </p>
              <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
                {compliance.toFixed(1)}%
              </p>
            </div>
            <p className="text-muted-foreground max-w-xs text-right text-xs">
              {slaTotal.toLocaleString()} response-time outcomes in this period
            </p>
          </div>
          <div className="px-4 py-3">
            <div className="bg-muted h-2.5 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full"
                style={{ width: `${compliance}%` }}
              />
            </div>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-muted/30 text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
                <th className="px-4 py-2.5 text-left">Outcome</th>
                <th className="px-4 py-2.5 text-right">Count</th>
                <th className="px-4 py-2.5 text-right">Share</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-border/70 border-t">
                <td className="px-4 py-2.5 font-medium">Response time met</td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {report.sla.met.toLocaleString()}
                </td>
                <td className="text-muted-foreground px-4 py-2.5 text-right tabular-nums">
                  {percent(report.sla.met, slaTotal)}
                </td>
              </tr>
              <tr className="border-border/70 border-t">
                <td className="px-4 py-2.5 font-medium">Response time missed</td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {report.sla.breached.toLocaleString()}
                </td>
                <td className="text-muted-foreground px-4 py-2.5 text-right tabular-nums">
                  {percent(report.sla.breached, slaTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <footer className="text-muted-foreground border-border space-y-1 border-t pt-4 text-[11px] leading-relaxed">
        <p>
          <span className="text-foreground/80 font-medium">Methodology:</span>{" "}
          Open counts are point-in-time backlog. Resolved and approved counts
          are outcomes within the reporting period. Percentages may not sum to
          100.0% due to rounding.
        </p>
        <p>
          Generated from the Yukti ITSM system of record. For internal
          management review — not for external distribution without approval.
        </p>
      </footer>
    </article>
  );
}

function InfoRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <tr className={last ? undefined : "border-border/70 border-b"}>
      <th className="text-muted-foreground bg-muted/30 w-[34%] px-4 py-2.5 text-left text-xs font-medium">
        {label}
      </th>
      <td className="px-4 py-2.5 font-medium">{value}</td>
    </tr>
  );
}

function KpiTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="border-border rounded-lg border px-4 py-3">
      <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
        {value.toLocaleString()}
      </p>
      <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
    </div>
  );
}

function BreakdownTable({
  index,
  title,
  column,
  rows,
  total,
}: {
  index: number;
  title: string;
  column: string;
  rows: Array<{ label: string; count: number }>;
  total: number;
}) {
  const sorted = [...rows].sort((a, b) => b.count - a.count);

  return (
    <section>
      <h3 className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-[0.14em] uppercase">
        {index}. {title}
      </h3>
      {sorted.length === 0 ? (
        <p className="text-muted-foreground border-border rounded-lg border px-4 py-4 text-xs">
          No data for this period.
        </p>
      ) : (
        <div className="border-border overflow-hidden rounded-lg border">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/40 text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
                <th className="w-10 px-3 py-2.5 text-left">#</th>
                <th className="px-3 py-2.5 text-left">{column}</th>
                <th className="px-3 py-2.5 text-right">Count</th>
                <th className="min-w-[7rem] px-3 py-2.5 text-left">
                  Distribution
                </th>
                <th className="px-3 py-2.5 text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, i) => {
                const share = total > 0 ? (row.count / total) * 100 : 0;
                return (
                  <tr key={row.label} className="border-border/70 border-t">
                    <td className="text-muted-foreground px-3 py-2 tabular-nums">
                      {i + 1}
                    </td>
                    <td className="px-3 py-2 font-medium">{row.label}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {row.count.toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                        <div
                          className="bg-primary/80 h-full rounded-full"
                          style={{ width: `${Math.min(100, share)}%` }}
                        />
                      </div>
                    </td>
                    <td className="text-muted-foreground px-3 py-2 text-right tabular-nums">
                      {percent(row.count, total)}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-border/70 bg-muted/25 border-t font-semibold">
                <td className="px-3 py-2.5" colSpan={2}>
                  Total
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {total.toLocaleString()}
                </td>
                <td className="px-3 py-2.5" />
                <td className="text-muted-foreground px-3 py-2.5 text-right tabular-nums">
                  100.0%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
