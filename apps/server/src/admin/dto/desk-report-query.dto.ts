import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional } from "class-validator";
import { CHART_RANGE_PRESETS } from "../chart-range";
import type { DeskReportRange } from "../desk-report";

export class DeskReportQueryDto {
  @ApiPropertyOptional({ enum: CHART_RANGE_PRESETS, default: "30d" })
  @IsOptional()
  @IsIn([...CHART_RANGE_PRESETS])
  range?: DeskReportRange = "30d";

  @ApiPropertyOptional({
    enum: ["json", "csv", "excel"],
    default: "json",
  })
  @IsOptional()
  @IsIn(["json", "csv", "excel"])
  format?: "json" | "csv" | "excel" = "json";
}
