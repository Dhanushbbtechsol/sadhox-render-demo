import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from "class-validator";

const PROBLEM_STATUSES = [
  "Open",
  "Investigating",
  "KnownError",
  "Resolved",
  "Closed",
] as const;

export class CreateProblemDto {
  @ApiProperty({ minLength: 5, maxLength: 255 })
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  title!: string;

  @ApiProperty({ minLength: 10 })
  @IsString()
  @MinLength(10)
  @MaxLength(10_000)
  description!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  rootCause?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  knownError?: boolean;

  @ApiPropertyOptional({
    enum: PROBLEM_STATUSES,
    default: "Open",
  })
  @IsOptional()
  @IsIn([...PROBLEM_STATUSES])
  status?: (typeof PROBLEM_STATUSES)[number];

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional({
    type: [String],
    description: "Incident IDs to link to this problem",
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID("4", { each: true })
  linkedIncidentIds?: string[];
}

export class UpdateProblemDto {
  @ApiPropertyOptional({ minLength: 5, maxLength: 255 })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ minLength: 10 })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(10_000)
  description?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  rootCause?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  knownError?: boolean;

  @ApiPropertyOptional({ enum: PROBLEM_STATUSES })
  @IsOptional()
  @IsIn([...PROBLEM_STATUSES])
  status?: (typeof PROBLEM_STATUSES)[number];

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  assignedTo?: string | null;

  @ApiPropertyOptional({
    type: [String],
    description: "Replace linked incident IDs when provided",
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID("4", { each: true })
  linkedIncidentIds?: string[];
}

export class ListProblemsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional({ enum: PROBLEM_STATUSES })
  @IsOptional()
  @IsIn([...PROBLEM_STATUSES])
  status?: (typeof PROBLEM_STATUSES)[number];
}
