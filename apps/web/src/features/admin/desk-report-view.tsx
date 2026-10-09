import type { DeskReport } from "./types";

export function DeskReportView({ report }: { report: DeskReport }) {
  return (
    <div className="flex flex-col gap-4 text-sm">
      <div>
        <h2 className="text-lg font-semibold">{report.title}</h2>
        <p className="text-muted-foreground text-xs">
          Generated {new Date(report.generatedAt).toLocaleString()} · Range{" "}
          {report.range} · Scope {report.scope}
        </p>
      </div>

      <section className="space-y-1">
        <h3 className="font-medium">KPIs</h3>
        <ul className="text-muted-foreground grid gap-1 sm:grid-cols-2">
          <li>Incidents open: {report.kpis.incidentsOpen}</li>
          <li>Incidents resolved: {report.kpis.incidentsResolved}</li>
          <li>Service requests open: {report.kpis.serviceRequestsOpen}</li>
          <li>Service requests approved: {report.kpis.serviceRequestsApproved}</li>
        </ul>
      </section>

      <BucketSection title="Status" rows={report.byStatus.map((r) => [r.status, r.count])} />
      <BucketSection
        title="Priority"
        rows={report.byPriority.map((r) => [r.priority, r.count])}
      />
      <BucketSection
        title="Category"
        rows={report.byCategory.map((r) => [r.category, r.count])}
      />

      <section className="space-y-1">
        <h3 className="font-medium">SLA</h3>
        <p className="text-muted-foreground">
          Met {report.sla.met} · Breached {report.sla.breached} · Rate{" "}
          {report.sla.rate}%
        </p>
      </section>
    </div>
  );
}

function BucketSection({
  title,
  rows,
}: {
  title: string;
  rows: Array<[string, number]>;
}) {
  return (
    <section className="space-y-1">
      <h3 className="font-medium">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-muted-foreground text-xs">No rows</p>
      ) : (
        <ul className="text-muted-foreground space-y-0.5">
          {rows.map(([label, count]) => (
            <li key={label} className="flex justify-between gap-4">
              <span>{label}</span>
              <span className="tabular-nums">{count}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
