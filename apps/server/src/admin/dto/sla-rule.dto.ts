import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  Max,
  Min,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from "class-validator";

export const SLA_PRIORITIES = ["P1", "P2", "P3", "P4"] as const;
export type SlaPriority = (typeof SLA_PRIORITIES)[number];

/** Cap: 1 year in minutes — UI edits table cells, not multi-year targets. */
export const SLA_MINUTES_MAX = 525_600;

@ValidatorConstraint({ name: "resolveGteResponse", async: false })
class ResolveGteResponseConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments) {
    const obj = args.object as {
      responseMinutes?: number;
      resolveMinutes?: number;
    };
    if (
      typeof obj.responseMinutes !== "number" ||
      typeof obj.resolveMinutes !== "number"
    ) {
      return true;
    }
    return obj.resolveMinutes >= obj.responseMinutes;
  }

  defaultMessage() {
    return "resolveMinutes must be greater than or equal to responseMinutes";
  }
}

/** Minutes body shared by path and body-priority PATCH shapes. */
export class UpdateSlaRuleMinutesDto {
  @ApiProperty({ example: 15, minimum: 1, maximum: SLA_MINUTES_MAX })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(SLA_MINUTES_MAX)
  responseMinutes!: number;

  @ApiProperty({ example: 240, minimum: 1, maximum: SLA_MINUTES_MAX })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(SLA_MINUTES_MAX)
  @Validate(ResolveGteResponseConstraint)
  resolveMinutes!: number;
}

/**
 * Body-only PATCH /admin/sla-rules (frontend fallback).
 * Primary client path is PATCH /admin/sla-rules/:priority.
 */
export class UpdateSlaRuleDto extends UpdateSlaRuleMinutesDto {
  @ApiProperty({ enum: SLA_PRIORITIES })
  @IsIn([...SLA_PRIORITIES])
  priority!: SlaPriority;
}

/** Optional wrapper if callers send priority in body alongside path (ignored). */
export class UpdateSlaRulePathBodyDto extends UpdateSlaRuleMinutesDto {
  @ApiPropertyOptional({
    enum: SLA_PRIORITIES,
    description: "Ignored when priority is in the path",
  })
  @IsOptional()
  @IsIn([...SLA_PRIORITIES])
  priority?: SlaPriority;
}
