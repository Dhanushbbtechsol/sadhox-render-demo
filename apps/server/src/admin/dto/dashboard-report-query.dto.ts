import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional } from "class-validator";
import type { ChartRangePreset } from "../chart-range";
import { REPORT_TYPES, type ReportType } from "../dashboard-report-csv";

export const TYPED_REPORT_FORMATS = ["excel", "csv"] as const;
export type ReportFormat = (typeof TYPED_REPORT_FORMATS)[number];

export const DASHBOARD_REPORT_FORMATS = ["excel", "csv", "json"] as const;
export type DashboardReportFormat = (typeof DASHBOARD_REPORT_FORMATS)[number];

/**
 * Combined query for Phase 9 desk report (no `type`) and typed exports (`type` set).
 * - Desk: format=json|csv
 * - Typed: format=excel|csv (summary defaults excel; ticket types default csv)
 */
export class DashboardReportQueryDto {
  @ApiPropertyOptional({ enum: ["7d", "30d", "ytd"], default: "30d" })
  @IsOptional()
  @IsIn(["7d", "30d", "ytd"])
  range?: ChartRangePreset = "30d";

  @ApiPropertyOptional({
    enum: REPORT_TYPES,
    description:
      "When set, returns typed summary/ticket export. When omitted, returns Phase 9 desk report.",
  })
  @IsOptional()
  @IsIn([...REPORT_TYPES])
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
  if (format === "excel" || format === "csv") return format;
  return "csv";
}
