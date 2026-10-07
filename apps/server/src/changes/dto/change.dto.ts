import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  Validate,
  ValidateIf,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
  type ValidationArguments,
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

@ValidatorConstraint({ name: "isAfterScheduledStart", async: false })
class IsAfterScheduledStartConstraint implements ValidatorConstraintInterface {
  validate(scheduledEnd: string, args: ValidationArguments) {
    const obj = args.object as { scheduledStart?: string };
    if (!obj.scheduledStart || !scheduledEnd) return true;
    const start = new Date(obj.scheduledStart).getTime();
    const end = new Date(scheduledEnd).getTime();
    if (Number.isNaN(start) || Number.isNaN(end)) return true;
    return end > start;
  }

  defaultMessage() {
    return "scheduledEnd must be after scheduledStart";
  }
}

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
  @Validate(IsAfterScheduledStartConstraint)
  scheduledEnd!: string;

  @ApiProperty({
    description:
      "Rollback plan (required for Normal and Emergency; optional for Standard)",
  })
  @ValidateIf(
    (o: CreateChangeDto) => o.type === "Normal" || o.type === "Emergency",
  )
  @IsString()
  @MinLength(1, {
    message: "Rollback plan is required for Normal and Emergency changes",
  })
  rollbackPlan!: string;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  projectId?: string | null;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  moduleId?: string | null;
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
