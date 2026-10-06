import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

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

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
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

  @ApiProperty({ example: "IT Hardware" })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  department!: string;

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
