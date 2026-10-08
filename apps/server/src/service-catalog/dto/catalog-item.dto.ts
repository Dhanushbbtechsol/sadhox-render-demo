import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

/** Per select option label — matches field `label` max. */
export const CATALOG_OPTION_MAX_LENGTH = 128;
/** Enough for typical select lists; blocks unbounded payload arrays. */
export const CATALOG_OPTIONS_MAX_SIZE = 50;
/** Concrete service label (free text); matches `department` max / column. */
export const CATALOG_SUBCATEGORY_MAX_LENGTH = 128;

class CatalogFormFieldDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  name!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  label!: string;

  @ApiProperty({ enum: ["text", "textarea", "select"] })
  @IsIn(["text", "textarea", "select"])
  type!: "text" | "textarea" | "select";

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({
    type: [String],
    description: `Select options (max ${CATALOG_OPTIONS_MAX_SIZE}, each ≤ ${CATALOG_OPTION_MAX_LENGTH} chars)`,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(CATALOG_OPTIONS_MAX_SIZE)
  @IsString({ each: true })
  @MaxLength(CATALOG_OPTION_MAX_LENGTH, { each: true })
  options?: string[];
}

export class CreateCatalogItemDto {
  @ApiProperty({ example: "Request Monitor" })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  description!: string;

  @ApiProperty({ example: "Hardware" })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  department!: string;

  @ApiPropertyOptional({
    example: "Laptop request",
    maxLength: CATALOG_SUBCATEGORY_MAX_LENGTH,
    nullable: true,
    description:
      "Optional grouping under department (Phase 7). Free-text service label, not validated against the incident category map. Catalog category remains department.",
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(CATALOG_SUBCATEGORY_MAX_LENGTH)
  subcategory?: string | null;

  @ApiProperty({ type: [CatalogFormFieldDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CatalogFormFieldDto)
  formFields!: CatalogFormFieldDto[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCatalogItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  department?: string;

  @ApiPropertyOptional({
    example: "Laptop request",
    maxLength: CATALOG_SUBCATEGORY_MAX_LENGTH,
    nullable: true,
    description:
      "Optional grouping under department (Phase 7). Free-text service label, not validated against the incident category map. Pass null to clear.",
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(CATALOG_SUBCATEGORY_MAX_LENGTH)
  subcategory?: string | null;

  @ApiPropertyOptional({ type: [CatalogFormFieldDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CatalogFormFieldDto)
  formFields?: CatalogFormFieldDto[];

  @ApiPropertyOptional({
    description: "Set false to deactivate (soft-hide from End User browse)",
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
