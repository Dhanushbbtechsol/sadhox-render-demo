import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from "class-validator";

export class UpdateAssetDto {
  @ApiPropertyOptional({ example: "HW-1042" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  assetTag?: string;

  @ApiPropertyOptional({ example: "Dell Latitude 5540" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ enum: ["Hardware", "Software"] })
  @IsOptional()
  @IsIn(["Hardware", "Software"])
  type?: "Hardware" | "Software";

  @ApiPropertyOptional({ enum: ["Active", "InRepair", "Retired"] })
  @IsOptional()
  @IsIn(["Active", "InRepair", "Retired"])
  status?: "Active" | "InRepair" | "Retired";

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsUUID()
  ownerId?: string | null;

  @ApiPropertyOptional({ maxLength: 128, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  @MaxLength(128)
  serialNumber?: string | null;

  @ApiPropertyOptional({ maxLength: 128, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  @MaxLength(128)
  location?: string | null;

  @ApiPropertyOptional({ example: "1299.00", nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsNumberString()
  purchaseCost?: string | null;

  @ApiPropertyOptional({ maxLength: 500, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  @MaxLength(500)
  assignmentNote?: string | null;
}
