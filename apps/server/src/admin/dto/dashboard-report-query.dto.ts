import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional } from "class-validator";
import { CHART_RANGE_PRESETS, type ChartRangePreset } from "../chart-range";
import { REPORT_TYPES, type ReportType } from "../dashboard-report-csv";

export const TYPED_REPORT_FORMATS = ["excel", "csv"] as const;
export type ReportFormat = (typeof TYPED_REPORT_FORMATS)[number];

export const DASHBOARD_REPORT_FORMATS = ["excel", "csv", "json", "xlsx"] as const;
export type DashboardReportFormat = (typeof DASHBOARD_REPORT_FORMATS)[number];

/**
 * Combined query for Phase 9 desk report (no `type`) and typed exports (`type` set).
 * - Desk: format=json|csv
 * - Typed: format=excel|csv (summary defaults excel; ticket types default csv)
 */
export class DashboardReportQueryDto {
  @ApiPropertyOptional({ enum: CHART_RANGE_PRESETS, default: "30d" })
  @IsOptional()
  @IsIn([...CHART_RANGE_PRESETS])
  range?: ChartRangePreset = "30d";

  @ApiPropertyOptional({
    enum: REPORT_TYPES,
    description:
      "When set, returns typed summary/ticket/asset export. When omitted, returns Phase 9 desk report.",
  })
  @IsOptional()
  @IsIn([
    "summary",
    "all",
    "assigned",
    "in-progress",
    "approved",
    "open",
    "assets",
  ])
  type?: ReportType;

  @ApiPropertyOptional({
    enum: DASHBOARD_REPORT_FORMATS,
    description: "Desk: json|csv. Typed: excel|csv.",
  })
  @IsOptional()
  @IsIn([...DASHBOARD_REPORT_FORMATS])
  format?: DashboardReportFormat;
}

export function resolveTypedReportFormat(
  _type: ReportType,
  format?: DashboardReportFormat,
): ReportFormat {
  if (format === "excel" || format === "xlsx") return "excel";
  if (format === "csv") return "csv";
  return "csv";
}
