import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from "class-validator";

export class CreateServiceRequestDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  catalogId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
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
