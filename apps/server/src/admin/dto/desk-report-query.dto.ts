import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional } from "class-validator";
import type { DeskReportRange } from "../desk-report";

export class DeskReportQueryDto {
  @ApiPropertyOptional({ enum: ["7d", "30d", "ytd"], default: "30d" })
  @IsOptional()
  @IsIn(["7d", "30d", "ytd"])
  range?: DeskReportRange = "30d";

  @ApiPropertyOptional({ enum: ["json", "csv"], default: "json" })
  @IsOptional()
  @IsIn(["json", "csv"])
  format?: "json" | "csv" = "json";
}
