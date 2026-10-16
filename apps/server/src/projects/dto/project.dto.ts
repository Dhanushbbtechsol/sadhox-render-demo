import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";

export class CreateProjectDto {
  @ApiProperty({ example: "Campus Network" })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @ApiProperty({
    format: "uuid",
    description: "User with role Manager who owns this project",
  })
  @IsUUID()
  managerId!: string;
}

export class UpdateProjectDto {
  @ApiPropertyOptional({ example: "Campus Network" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    format: "uuid",
    description: "User with role Manager who owns this project",
  })
  @IsOptional()
  @IsUUID()
  managerId?: string;
}

export class AddProjectMemberDto {
  @ApiProperty({
    format: "uuid",
    description: "Any existing user (Admin, Agent, EndUser, Manager)",
  })
  @IsUUID()
  userId!: string;
}

export class CreateModuleDto {
  @ApiProperty({ example: "Wi-Fi" })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;
}

export class UpdateModuleDto {
  @ApiProperty({ example: "Wi-Fi Core" })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;
}

/** One module in the desired full set for {@link SaveProjectSummaryDto}. Omit `id` to create. */
export class ProjectSummaryModuleDto {
  @ApiPropertyOptional({
    format: "uuid",
    description: "Existing module id; omitted means create a new module",
  })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({ example: "Wi-Fi" })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;
}

/**
 * U8 — one save for the project summary dialog. Carries the full desired
 * state for name, manager, members, and modules so the server can persist
 * all four together (same transaction) instead of one PATCH plus separate
 * per-item member/module calls.
 */
export class SaveProjectSummaryDto {
  @ApiProperty({ example: "Campus Network" })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @ApiProperty({
    format: "uuid",
    description: "User with role Manager who owns this project",
  })
  @IsUUID()
  managerId!: string;

  @ApiProperty({
    type: [String],
    description: "Full desired set of user ids as project members (any role)",
  })
  @IsArray()
  @ArrayUnique()
  @IsUUID("4", { each: true })
  memberUserIds!: string[];

  @ApiProperty({
    type: [ProjectSummaryModuleDto],
    description: "Full desired set of modules (existing id = keep/rename)",
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectSummaryModuleDto)
  modules!: ProjectSummaryModuleDto[];
}
