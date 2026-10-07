import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID, ValidateIf } from "class-validator";

/** Optional Phase 6 project/module fields on ticket create/update DTOs. */
export class ProjectScopeFieldsDto {
  @ApiPropertyOptional({
    format: "uuid",
    nullable: true,
    description: "Null = global (no project) scope",
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  projectId?: string | null;

  @ApiPropertyOptional({
    format: "uuid",
    nullable: true,
    description: "Must belong to projectId when set",
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  moduleId?: string | null;
}
