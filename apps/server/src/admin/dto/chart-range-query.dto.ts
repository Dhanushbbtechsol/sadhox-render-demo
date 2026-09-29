import { IsIn, IsOptional } from "class-validator";
import type { ChartRangePreset } from "../chart-range";

export class ChartRangeQueryDto {
  @IsOptional()
  @IsIn(["7d", "30d", "ytd"])
  range?: ChartRangePreset = "30d";
}
