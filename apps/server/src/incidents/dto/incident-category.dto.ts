import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from "class-validator";

const PRIORITIES = ["P1", "P2", "P3", "P4"] as const;

export class CreateIncidentCategoryDto {
  @ApiProperty({ minLength: 1, maxLength: 64 })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  name!: string;
}

export class UpdateIncidentCategoryDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 64 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateIncidentSubcategoryDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  categoryId!: string;

  @ApiProperty({ minLength: 1, maxLength: 128 })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  name!: string;

  @ApiPropertyOptional({
    enum: PRIORITIES,
    nullable: true,
    description: "Minimum priority floor (null = no floor)",
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsIn([...PRIORITIES])
  minPriority?: (typeof PRIORITIES)[number] | null;
}

export class UpdateIncidentSubcategoryDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 128 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  name?: string;

  @ApiPropertyOptional({ enum: PRIORITIES, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsIn([...PRIORITIES])
  minPriority?: (typeof PRIORITIES)[number] | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
