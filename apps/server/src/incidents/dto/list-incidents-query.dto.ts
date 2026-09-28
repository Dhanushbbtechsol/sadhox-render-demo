import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from "class-validator";

export class ListIncidentsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional({
    enum: ["New", "Assigned", "InProgress", "Resolved", "Closed"],
  })
  @IsOptional()
  @IsIn(["New", "Assigned", "InProgress", "Resolved", "Closed"])
  status?: "New" | "Assigned" | "InProgress" | "Resolved" | "Closed";

  @ApiPropertyOptional({ enum: ["P1", "P2", "P3", "P4"] })
  @IsOptional()
  @IsIn(["P1", "P2", "P3", "P4"])
  priority?: "P1" | "P2" | "P3" | "P4";

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID()
  reporterId?: string;

  @ApiPropertyOptional({
    enum: ["createdAt", "priority", "status", "slaDueAt"],
    default: "createdAt",
  })
  @IsOptional()
  @IsIn(["createdAt", "priority", "status", "slaDueAt"])
  sortBy?: "createdAt" | "priority" | "status" | "slaDueAt" = "createdAt";

  @ApiPropertyOptional({ enum: ["asc", "desc"], default: "desc" })
  @IsOptional()
  @IsIn(["asc", "desc"])
  sortDir?: "asc" | "desc" = "desc";
}
