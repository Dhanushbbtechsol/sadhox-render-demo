import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";

export class ListAgentsQueryDto {
  @ApiPropertyOptional({
    format: "uuid",
    description:
      "When set, return that project's Agent members only; omit for global Agent pool",
  })
  @IsOptional()
  @IsUUID()
  projectId?: string;
}
