import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateAssetDto {
  @ApiProperty({ example: "HW-1042" })
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  assetTag!: string;

  @ApiProperty({ example: "Dell Latitude 5540" })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @ApiProperty({ enum: ["Hardware", "Software"] })
  @IsIn(["Hardware", "Software"])
  type!: "Hardware" | "Software";

  @ApiPropertyOptional({ enum: ["Active", "InRepair", "Retired"] })
  @IsOptional()
  @IsIn(["Active", "InRepair", "Retired"])
  status?: "Active" | "InRepair" | "Retired";

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @ApiPropertyOptional({ maxLength: 128 })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  serialNumber?: string;

  @ApiPropertyOptional({ maxLength: 128 })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  location?: string;

  /** Admin-only financial field (string decimal for numeric column). */
  @ApiPropertyOptional({ example: "1299.00" })
  @IsOptional()
  @IsNumberString()
  purchaseCost?: string;
}
