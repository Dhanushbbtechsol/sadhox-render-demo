import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

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
  @IsUUID()
  ownerId?: string | null;
}
