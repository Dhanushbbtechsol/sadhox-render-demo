import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateServiceRequestDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  catalogId!: string;

  @ApiProperty({ maxLength: 4000 })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  justification!: string;

  @ApiProperty({ enum: ["Low", "Medium", "High"] })
  @IsIn(["Low", "Medium", "High"])
  urgency!: "Low" | "Medium" | "High";

  @ApiPropertyOptional({ type: "object", additionalProperties: { type: "string" } })
  @IsOptional()
  @IsObject()
  fields?: Record<string, string>;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  projectId?: string | null;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @IsUUID()
  moduleId?: string | null;
}

export class RejectServiceRequestDto {
  @ApiProperty({ description: "Rejection reason (required)", maxLength: 4000 })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  reason!: string;
}

export class FulfillServiceRequestDto {
  @ApiProperty({ description: "Completion notes when closing fulfillment" })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  notes!: string;
}
