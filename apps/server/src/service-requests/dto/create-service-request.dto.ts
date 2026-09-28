import { ApiProperty } from "@nestjs/swagger";
import {
  IsIn,
  IsObject,
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

  @ApiProperty({
    type: "object",
    additionalProperties: { type: "string" },
    example: { laptopType: "Developer" },
  })
  @IsObject()
  fields!: Record<string, unknown>;
}
