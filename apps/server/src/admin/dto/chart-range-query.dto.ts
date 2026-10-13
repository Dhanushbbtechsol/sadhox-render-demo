import { IsIn, IsOptional } from "class-validator";
import { CHART_RANGE_PRESETS, type ChartRangePreset } from "../chart-range";

export class ChartRangeQueryDto {
  @IsOptional()
  @IsIn([...CHART_RANGE_PRESETS])
  range?: ChartRangePreset = "30d";
}
