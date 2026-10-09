import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional } from "class-validator";
import type { ChartRangePreset } from "../chart-range";
import { REPORT_TYPES, type ReportType } from "../dashboard-report-csv";

export const REPORT_FORMATS = ["excel", "csv"] as const;
export type ReportFormat = (typeof REPORT_FORMATS)[number];

export class DashboardReportQueryDto {
  @ApiPropertyOptional({ enum: ["7d", "30d", "ytd"], default: "30d" })
  @IsOptional()
  @IsIn(["7d", "30d", "ytd"])
  range?: ChartRangePreset = "30d";

  @ApiPropertyOptional({ enum: REPORT_TYPES, default: "summary" })
  @IsOptional()
  @IsIn([...REPORT_TYPES])
  type?: ReportType = "summary";

  /** excel = SpreadsheetML multi-sheet (.xls); csv = tidy figures only (summary) or ticket CSV (other types). */
  @ApiPropertyOptional({ enum: REPORT_FORMATS, default: "excel" })
  @IsOptional()
  @IsIn([...REPORT_FORMATS])
  format?: ReportFormat = "excel";
}
