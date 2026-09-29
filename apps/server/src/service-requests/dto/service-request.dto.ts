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
}

export class RejectServiceRequestDto {
  @ApiProperty({ description: "Rejection reason (required)" })
  @IsString()
  @MinLength(1)
  reason!: string;
}

export class FulfillServiceRequestDto {
  @ApiProperty({ description: "Completion notes when closing fulfillment" })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  notes!: string;
}
