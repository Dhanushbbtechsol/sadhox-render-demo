import { EyeIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { DeskReportView } from "./desk-report-view";
import {
  downloadDashboardReport,
  downloadOrganizationReport,
  fetchDeskReport,
  type OperationReportModule,
  type ReportDateBounds,
} from "./export-dashboard-csv";
import { REPORT_DOWNLOAD_FORMATS } from "./report-download";
import type { ChartRange, DeskReport } from "./types";
import { UserActivityReportSection } from "./user-activity-report";

const PRESET_OPTIONS: { value: ChartRange; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "quarter", label: "Quarter" },
  { value: "year", label: "Last 12 months" },
];

const OPERATIONS: {
  module: OperationReportModule;
  title: string;
  blurb: string;
}[] = [
  {
    module: "tickets",
    title: "Tickets",
    blurb: "Incidents raised in the selected period",
  },
  {
    module: "issues",
    title: "Issues",
    blurb: "Problem / root-cause records",
  },
  {
    module: "requests",
    title: "Requests",
    blurb: "Service requests from the catalog",
  },
  {
    module: "changes",
    title: "Change requests",
    blurb: "Change of management records",
  },
];

type RangeState = {
  preset: ChartRange;
  fromDate: string;
  toDate: string;
};

function resolveDownloadRange(
  state: RangeState,
): ChartRange | ReportDateBounds | null {
  const useCustom = Boolean(state.fromDate || state.toDate);
  if (!useCustom) return state.preset;
  if (!state.fromDate || !state.toDate) return null;
  if (state.fromDate > state.toDate) return null;
  return { from: state.fromDate, to: state.toDate };
}

function rangeError(state: RangeState): string | null {
  const useCustom = Boolean(state.fromDate || state.toDate);
  if (!useCustom) return null;
  if (!state.fromDate || !state.toDate) {
    return "Pick both a from and to date, or clear dates to use the preset.";
  }
  if (state.fromDate > state.toDate) {
    return "From date must be on or before the to date.";
  }
  return null;
}

function RangeControls({
  idPrefix,
  state,
  onChange,
}: {
  idPrefix: string;
  state: RangeState;
  onChange: (next: RangeState) => void;
}) {
  const useCustom = Boolean(state.fromDate || state.toDate);
  const error = rangeError(state);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Range preset</Label>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={
                !useCustom && state.preset === option.value
                  ? "default"
                  : "outline"
              }
              className={cn(useCustom && "opacity-60")}
              onClick={() =>
                onChange({
                  preset: option.value,
                  fromDate: "",
                  toDate: "",
                })
              }
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-from`}>From</Label>
          <Input
            id={`${idPrefix}-from`}
            type="date"
            value={state.fromDate}
            onChange={(event) =>
              onChange({ ...state, fromDate: event.target.value })
            }
            className="w-44"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-to`}>To</Label>
          <Input
            id={`${idPrefix}-to`}
            type="date"
            value={state.toDate}
            onChange={(event) =>
              onChange({ ...state, toDate: event.target.value })
            }
            className="w-44"
          />
        </div>
      </div>

      {error ? (
        <p className="text-destructive text-xs">{error}</p>
      ) : (
        <p className="text-muted-foreground text-xs">
          Leave dates empty to use the preset. Filling dates switches to a
          custom window.
        </p>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const [orgRange, setOrgRange] = useState<RangeState>({
    preset: "30d",
    fromDate: "",
    toDate: "",
  });
  const [opRange, setOpRange] = useState<RangeState>({
    preset: "30d",
    fromDate: "",
    toDate: "",
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [deskReport, setDeskReport] = useState<DeskReport | null>(null);

  const orgDownload = resolveDownloadRange(orgRange);
  const opDownload = resolveDownloadRange(opRange);
  const orgUsesCustom = Boolean(orgRange.fromDate || orgRange.toDate);

  async function run(
    key: string,
    action: () => Promise<void>,
    successMessage = "Download started",
  ) {
    setBusy(key);
    try {
      await action();
      toast.success(successMessage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Download failed");
    } finally {
      setBusy(null);
    }
  }

  async function handleViewDeskReport() {
    if (orgUsesCustom) {
      toast.error("Clear From / To and pick a preset to view the desk report.");
      return;
    }
    setBusy("view");
    try {
      const report = await fetchDeskReport(
        orgRange.preset,
        "/admin/dashboard/report",
      );
      setDeskReport(report);
      setViewOpen(true);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load report",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold">Reports</h1>
        <p className="text-muted-foreground text-sm">
          Organization-wide pack first, then a user report, or one operation at
          a time — each with its own date range.
        </p>
      </div>

      <section className="border-border/70 space-y-4 rounded-xl border p-5">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Organization report
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Use a preset or calendar dates, then download tickets, issues,
            requests, change requests, and assets (CSV or Excel — two files).
          </p>
        </div>

        <RangeControls
          idPrefix="org-report"
          state={orgRange}
          onChange={setOrgRange}
        />

        <div className="flex flex-wrap gap-2">
          {REPORT_DOWNLOAD_FORMATS.map((fmt) => (
            <Button
              key={`org-${fmt.value}`}
              type="button"
              variant={fmt.value === "excel" ? "default" : "outline"}
              disabled={busy !== null || !orgDownload}
              onClick={() => {
                if (!orgDownload) return;
                void run(
                  `organization-${fmt.value}`,
                  () =>
                    downloadOrganizationReport(orgDownload, fmt.value),
                  fmt.value === "csv"
                    ? "Saved operations + assets CSV files"
                    : "Saved operations + assets workbooks",
                );
              }}
            >
              {busy === `organization-${fmt.value}`
                ? "Preparing…"
                : `Download ${fmt.label}`}
            </Button>
          ))}
          <Button
            type="button"
            variant="outline"
            disabled={busy !== null || orgUsesCustom}
            onClick={() => void handleViewDeskReport()}
          >
            <EyeIcon />
            {busy === "view" ? "Loading…" : "View report"}
          </Button>
        </div>
        {orgUsesCustom ? (
          <p className="text-muted-foreground text-xs">
            View report works with a range preset (clear From / To).
          </p>
        ) : null}
      </section>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto sm:max-w-3xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Desk report</DialogTitle>
          </DialogHeader>
          {deskReport ? <DeskReportView report={deskReport} /> : null}
        </DialogContent>
      </Dialog>

      <UserActivityReportSection />

      <section className="border-border/70 space-y-4 rounded-xl border p-5">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            By operation
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Use a preset or calendar dates, then download one module as CSV or
            Excel.
          </p>
        </div>

        <RangeControls
          idPrefix="op-report"
          state={opRange}
          onChange={setOpRange}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          {OPERATIONS.map((op) => (
            <div
              key={op.module}
              className="flex flex-col gap-3 rounded-lg border p-4"
            >
              <div>
                <h3 className="font-medium">{op.title}</h3>
                <p className="text-muted-foreground text-xs">{op.blurb}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {REPORT_DOWNLOAD_FORMATS.map((fmt) => (
                  <Button
                    key={`${op.module}-${fmt.value}`}
                    type="button"
                    variant="outline"
                    disabled={busy !== null || !opDownload}
                    onClick={() => {
                      if (!opDownload) return;
                      void run(`${op.module}-${fmt.value}`, () =>
                        downloadDashboardReport(
                          opDownload,
                          "all",
                          fmt.value,
                          op.module,
                        ),
                      );
                    }}
                  >
                    {busy === `${op.module}-${fmt.value}`
                      ? "Preparing…"
                      : fmt.label}
                  </Button>
                ))}
              </div>
            </div>
          ))}

          <div className="flex flex-col gap-3 rounded-lg border p-4">
            <div>
              <h3 className="font-medium">Assets</h3>
              <p className="text-muted-foreground text-xs">
                Asset register snapshot for the selected period
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {REPORT_DOWNLOAD_FORMATS.map((fmt) => (
                <Button
                  key={`assets-${fmt.value}`}
                  type="button"
                  variant="outline"
                  disabled={busy !== null || !opDownload}
                  onClick={() => {
                    if (!opDownload) return;
                    void run(`assets-${fmt.value}`, () =>
                      downloadDashboardReport(
                        opDownload,
                        "assets",
                        fmt.value,
                      ),
                    );
                  }}
                >
                  {busy === `assets-${fmt.value}` ? "Preparing…" : fmt.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
