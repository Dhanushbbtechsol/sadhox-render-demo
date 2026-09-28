import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
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

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  justification!: string;

  @ApiProperty({ enum: ["Low", "Medium", "High"] })
  @IsString()
  urgency!: string;

  @ApiPropertyOptional({ type: "object", additionalProperties: true })
  @IsOptional()
  @IsObject()
  fields?: Record<string, unknown>;
}
