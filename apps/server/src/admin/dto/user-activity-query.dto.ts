import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsUUID,
  ValidateIf,
} from "class-validator";

import { CHART_RANGE_PRESETS } from "../chart-range";

export type UserActivityRange =
  | (typeof CHART_RANGE_PRESETS)[number]
  | "custom";

const ACTIVITY_RANGES = [...CHART_RANGE_PRESETS, "custom"] as const;

/**
 * Admin individual activity report.
 * Presets: 7d | 30d | quarter | ytd | year. Custom needs from + to.
 */
export class UserActivityQueryDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  userId!: string;

  @ApiPropertyOptional({
    enum: ACTIVITY_RANGES,
    default: "30d",
  })
  @IsOptional()
  @IsIn([...ACTIVITY_RANGES])
  range?: UserActivityRange = "30d";

  @ApiPropertyOptional({
    description: "Required when range=custom (inclusive start)",
  })
  @ValidateIf((q: UserActivityQueryDto) => q.range === "custom")
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: "Required when range=custom (inclusive end)",
  })
  @ValidateIf((q: UserActivityQueryDto) => q.range === "custom")
  @IsDateString()
  to?: string;
}
