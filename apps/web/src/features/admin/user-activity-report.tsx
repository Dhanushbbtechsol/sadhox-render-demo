import { useQuery } from "@tanstack/react-query";
import { DownloadIcon } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

import { formatAuditAction } from "./audit-activity";
import {
  downloadPersonActivityReport,
  PERSON_ASSET_COLUMNS,
  PERSON_AUDIT_COLUMNS,
  PERSON_CHANGE_COLUMNS,
  PERSON_REQUEST_COLUMNS,
  PERSON_TICKET_COLUMNS,
  REPORT_DOWNLOAD_FORMATS,
  type ReportDownloadFormat,
} from "./report-download";
import type { ChartRange } from "./types";
import { useAdminUsers, type AdminUser } from "./use-admin-users";

type ActivityRange = ChartRange | "custom";

type TicketRow = {
  id: string;
  referenceCode: string;
  title: string;
  status: string;
  priority: string;
  category: string;
  subcategory: string;
  impact: string;
  urgency: string;
  slaBreached: boolean;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
};

type RequestRow = {
  id: string;
  referenceCode: string;
  title: string;
  status: string;
  urgency: string;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  fulfilledAt: string | null;
};

type ChangeRow = {
  id: string;
  referenceCode: string;
  title: string;
  status: string;
  type: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
};

type AuditRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  referenceCode: string | null;
  createdAt: string;
};

type AssetRow = {
  id: string;
  referenceCode: string;
  assetTag: string;
  name: string;
  type: string;
  status: string;
  location: string | null;
  serialNumber: string | null;
  purchaseCost: string | null;
  assignedAt: string | null;
};

type UserActivityReport = {
  user: Pick<AdminUser, "id" | "name" | "email" | "role"> & {
    referenceCode: string;
    reportsToId: string | null;
    reportsToName: string | null;
    reportsToEmail: string | null;
    createdAt: string;
  };
  range: ActivityRange;
  from: string;
  to: string;
  ticketsReported: TicketRow[];
  requests: RequestRow[];
  changes: ChangeRow[];
  logs: AuditRow[];
  assets: AssetRow[];
  counts: {
    ticketsReported: number;
    requests: number;
    changes: number;
    logs: number;
    assets: number;
  };
};

const PRESET_OPTIONS: { value: ChartRange; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "quarter", label: "Quarter" },
  { value: "year", label: "Last 12 months" },
];

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T/.test(value) &&
    !Number.isNaN(Date.parse(value))
  ) {
    return formatWhen(value);
  }
  return String(value);
}

function SectionCard({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section className="border-border/70 space-y-3 rounded-xl border p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        <span className="text-muted-foreground text-xs tabular-nums">
          {count} row{count === 1 ? "" : "s"}
        </span>
      </div>
      {children}
    </section>
  );
}

function ResultTable({
  rows,
  columns,
}: {
  rows: Array<Record<string, unknown> & { id: string }>;
  columns: ReadonlyArray<{ key: string; label: string }>;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">None in this range.</p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key}>{col.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              {columns.map((col) => (
                <TableCell key={col.key} className="text-sm whitespace-nowrap">
                  {formatCell(row[col.key])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function stringifyRow(row: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    // Keep display refs only — never export raw UUID primary keys.
    if (key === "id" || key === "entityId") continue;
    if (value === null || value === undefined) out[key] = "";
    else if (typeof value === "boolean") out[key] = value ? "Yes" : "No";
    else out[key] = String(value);
  }
  return out;
}

/** Replace raw METHOD /path with a plain-language Action for UI + export. */
function withReadableAuditAction(row: AuditRow): AuditRow {
  return {
    ...row,
    action: formatAuditAction(row),
  };
}

export function UserActivityReportSection() {
  const users = useAdminUsers();
  const [userId, setUserId] = useState("");
  const [preset, setPreset] = useState<ChartRange>("30d");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitted, setSubmitted] = useState<{
    userId: string;
    range: ActivityRange;
    from?: string;
    to?: string;
  } | null>(null);

  const people = users.data ?? [];
  const personItems = useMemo(
    () =>
      Object.fromEntries(
        people.map((u) => [u.id, `${u.name} · ${u.role}`]),
      ) as Record<string, string>,
    [people],
  );

  const useCustom = Boolean(fromDate || toDate);
  const customError =
    useCustom && fromDate && toDate && fromDate > toDate
      ? "From date must be on or before the to date."
      : useCustom && (!fromDate || !toDate)
        ? "Pick both a from and to date."
        : null;

  const canRun =
    Boolean(userId) &&
    (!useCustom || (Boolean(fromDate) && Boolean(toDate) && !customError));

  const report = useQuery({
    queryKey: ["admin", "reports", "user-activity", submitted],
    queryFn: async () => {
      const params = new URLSearchParams({
        userId: submitted!.userId,
        range: submitted!.range,
      });
      if (submitted!.range === "custom") {
        params.set("from", submitted!.from!);
        params.set("to", submitted!.to!);
      }
      return apiFetch<UserActivityReport>(
        `/admin/reports/user-activity?${params.toString()}`,
      );
    },
    enabled: Boolean(submitted) && dialogOpen,
  });

  const readableLogs = useMemo(
    () => (report.data?.logs ?? []).map(withReadableAuditAction),
    [report.data?.logs],
  );

  function handleDownload(format: ReportDownloadFormat) {
    if (!report.data) return;
    try {
      const data = report.data;
      downloadPersonActivityReport(
        {
          user: {
            name: data.user.name,
            email: data.user.email,
            role: data.user.role,
            referenceCode: data.user.referenceCode,
            reportsToName: data.user.reportsToName,
            reportsToEmail: data.user.reportsToEmail,
            createdAt: data.user.createdAt,
          },
          range: data.range,
          from: data.from,
          to: data.to,
          counts: data.counts,
          ticketsReported: data.ticketsReported.map(stringifyRow),
          requests: data.requests.map(stringifyRow),
          changes: data.changes.map(stringifyRow),
          logs: readableLogs.map(stringifyRow),
          assets: data.assets.map(stringifyRow),
        },
        format,
      );
      toast.success(
        format === "csv" ? "CSV zip downloaded" : "Excel downloaded",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to download report",
      );
    }
  }

  return (
    <>
      <div className="border-border/70 space-y-4 rounded-xl border p-5">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            User report
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Any user, agent, manager, or admin — profile, tickets they reported,
            requests, change requests, assets they hold, and audit actions.
          </p>
        </div>

        <form
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canRun) return;
            const next = useCustom
              ? {
                  userId,
                  range: "custom" as const,
                  from: fromDate,
                  to: toDate,
                }
              : { userId, range: preset };
            setSubmitted(next);
            setDialogOpen(true);
          }}
        >
          <div className="space-y-4 sm:col-span-2 lg:col-span-1">
            <div className="space-y-1.5">
              <Label>User</Label>
              <Select
                value={userId || null}
                onValueChange={(value) => setUserId(value ?? "")}
                items={personItems}
              >
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {people.map((person) => (
                    <SelectItem
                      key={person.id}
                      value={person.id}
                      label={`${person.name} · ${person.role}`}
                    >
                      {person.name} · {person.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Range preset</Label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    size="sm"
                    variant={
                      !useCustom && preset === option.value
                        ? "default"
                        : "outline"
                    }
                    className={cn(useCustom && "opacity-60")}
                    onClick={() => {
                      setPreset(option.value);
                      setFromDate("");
                      setToDate("");
                    }}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="user-activity-from">From</Label>
                <Input
                  id="user-activity-from"
                  type="date"
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                  className="w-44"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="user-activity-to">To</Label>
                <Input
                  id="user-activity-to"
                  type="date"
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                  className="w-44"
                />
              </div>
            </div>
            {customError ? (
              <p className="text-destructive text-xs">{customError}</p>
            ) : (
              <p className="text-muted-foreground text-xs">
                Leave dates empty to use the preset. Filling dates switches to a
                custom window (includes year).
              </p>
            )}
          </div>

          <div className="flex items-end">
            <Button type="submit" disabled={!canRun} className="w-full sm:w-auto">
              Run report
            </Button>
          </div>
        </form>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSubmitted(null);
        }}
      >
        <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
          <DialogHeader className="border-b px-6 py-4 text-left">
            <DialogTitle>User report</DialogTitle>
            <DialogDescription>
              Same tables as below go into Excel sheets / CSV files — User,
              Tickets reported, Requests, Change requests, Assets held, Audit
              log.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-6 py-3">
            <div className="text-muted-foreground min-w-0 text-sm">
              {report.data ? (
                <>
                  <span className="text-foreground font-medium">
                    {report.data.user.name}
                  </span>
                  <span>
                    {" "}
                    · {report.data.user.role} · {report.data.range} ·{" "}
                    {formatWhen(report.data.from)} →{" "}
                    {formatWhen(report.data.to)}
                  </span>
                </>
              ) : report.isFetching ? (
                "Loading…"
              ) : (
                "—"
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {REPORT_DOWNLOAD_FORMATS.map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!report.data || report.isFetching}
                  onClick={() => handleDownload(opt.value)}
                >
                  <DownloadIcon />
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-4 overflow-y-auto px-6 py-5">
            {report.isFetching ? <Skeleton className="h-40 w-full" /> : null}

            {report.isError ? (
              <p className="text-destructive text-sm">
                {report.error instanceof Error
                  ? report.error.message
                  : "Failed to load report"}
              </p>
            ) : null}

            {report.data ? (
              <div className="grid gap-4">
                <section className="border-border/70 space-y-2 rounded-xl border p-4 text-sm">
                  <h3 className="text-sm font-semibold tracking-tight">
                    User
                  </h3>
                  <dl className="grid gap-1.5 sm:grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground text-xs">Ref</dt>
                      <dd className="font-medium">
                        {report.data.user.referenceCode}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground text-xs">Email</dt>
                      <dd className="font-medium">{report.data.user.email}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground text-xs">Role</dt>
                      <dd className="font-medium">{report.data.user.role}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground text-xs">
                        Reports to
                      </dt>
                      <dd className="font-medium">
                        {report.data.user.reportsToName
                          ? `${report.data.user.reportsToName}${
                              report.data.user.reportsToEmail
                                ? ` · ${report.data.user.reportsToEmail}`
                                : ""
                            }`
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground text-xs">
                        User created
                      </dt>
                      <dd className="font-medium">
                        {formatWhen(report.data.user.createdAt)}
                      </dd>
                    </div>
                  </dl>
                </section>

                <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
                  {(
                    [
                      ["Reported", report.data.counts.ticketsReported],
                      ["Requests", report.data.counts.requests],
                      ["Changes", report.data.counts.changes],
                      ["Assets", report.data.counts.assets],
                      ["Audit", report.data.counts.logs],
                    ] as const
                  ).map(([label, value]) => (
                    <div
                      key={label}
                      className="bg-muted/50 rounded-lg px-3 py-2 text-center"
                    >
                      <p className="text-muted-foreground text-xs">{label}</p>
                      <p className="text-lg font-semibold tabular-nums">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                <SectionCard
                  title="Tickets reported"
                  count={report.data.ticketsReported.length}
                >
                  <ResultTable
                    rows={report.data.ticketsReported}
                    columns={PERSON_TICKET_COLUMNS}
                  />
                </SectionCard>
                <SectionCard
                  title="Requests"
                  count={report.data.requests.length}
                >
                  <ResultTable
                    rows={report.data.requests}
                    columns={PERSON_REQUEST_COLUMNS}
                  />
                </SectionCard>
                <SectionCard
                  title="Change requests"
                  count={report.data.changes.length}
                >
                  <ResultTable
                    rows={report.data.changes}
                    columns={PERSON_CHANGE_COLUMNS}
                  />
                </SectionCard>
                <SectionCard
                  title="Assets held (current)"
                  count={report.data.assets.length}
                >
                  <ResultTable
                    rows={report.data.assets}
                    columns={PERSON_ASSET_COLUMNS}
                  />
                </SectionCard>
                <SectionCard title="Audit log" count={readableLogs.length}>
                  <ResultTable
                    rows={readableLogs}
                    columns={PERSON_AUDIT_COLUMNS}
                  />
                </SectionCard>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
