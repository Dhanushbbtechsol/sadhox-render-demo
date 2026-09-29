import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

const CHANGE_TYPES = ["Standard", "Normal", "Emergency"] as const;
const CHANGE_STATUSES = [
  "Draft",
  "Submitted",
  "Approved",
  "Scheduled",
  "Implemented",
  "Closed",
  "Rolled Back",
] as const;

export class CreateChangeDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  description!: string;

  @ApiProperty({ enum: CHANGE_TYPES })
  @IsIn(CHANGE_TYPES)
  type!: (typeof CHANGE_TYPES)[number];

  @ApiProperty({ description: "ISO scheduled start time" })
  @IsDateString()
  scheduledStart!: string;

  @ApiProperty({ description: "ISO scheduled end time" })
  @IsDateString()
  scheduledEnd!: string;

  @ApiProperty({ description: "Rollback plan (required)" })
  @IsString()
  @MinLength(1)
  rollbackPlan!: string;
}

export class UpdateChangeDto {
  @ApiPropertyOptional({ enum: CHANGE_STATUSES })
  @IsOptional()
  @IsIn(CHANGE_STATUSES)
  status?: (typeof CHANGE_STATUSES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: CHANGE_TYPES })
  @IsOptional()
  @IsIn(CHANGE_TYPES)
  type?: (typeof CHANGE_TYPES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  rollbackPlan?: string;
}

export { CHANGE_STATUSES, CHANGE_TYPES };
