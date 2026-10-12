import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from "class-validator";

export class ListAssetsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ["Hardware", "Software"] })
  @IsOptional()
  @IsIn(["Hardware", "Software"])
  type?: "Hardware" | "Software";

  @ApiPropertyOptional({ enum: ["Active", "InRepair", "Retired"] })
  @IsOptional()
  @IsIn(["Active", "InRepair", "Retired"])
  status?: "Active" | "InRepair" | "Retired";

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  linkedTicketId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

/** Admin-only person holding report (R3, KTD5 interval overlap). */
export class PersonReportQueryDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  personId!: string;

  @ApiProperty()
  @IsDateString()
  from!: string;

  @ApiProperty()
  @IsDateString()
  to!: string;
}
