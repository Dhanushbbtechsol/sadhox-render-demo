import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from "class-validator";
import { ProjectScopeFieldsDto } from "../../common/dto/project-scope.dto";

const IMPACT_URGENCY = ["High", "Medium", "Low"] as const;

export class CreateIncidentDto extends ProjectScopeFieldsDto {
  @ApiProperty({ minLength: 5, maxLength: 255 })
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  title!: string;

  @ApiProperty({ minLength: 10 })
  @IsString()
  @MinLength(10)
  @MaxLength(10_000)
  description!: string;

  @ApiProperty({
    example: "Hardware",
    description: "Active category from Admin → Categories",
  })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  category!: string;

  @ApiProperty({
    example: "Laptop/Desktop",
    description: "Active subcategory under the selected category",
  })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  subcategory!: string;

  @ApiProperty({ enum: IMPACT_URGENCY })
  @IsIn([...IMPACT_URGENCY])
  impact!: (typeof IMPACT_URGENCY)[number];

  @ApiProperty({ enum: IMPACT_URGENCY })
  @IsIn([...IMPACT_URGENCY])
  urgency!: (typeof IMPACT_URGENCY)[number];

  @ApiPropertyOptional({
    format: "uuid",
    description:
      "Optional assignee at create (Admin/Agent/Manager). Sets status to Assigned.",
  })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;
}

export class UpdateIncidentDto extends ProjectScopeFieldsDto {
  @ApiPropertyOptional({ minLength: 5, maxLength: 255 })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ minLength: 10 })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(10_000)
  description?: string;

  @ApiPropertyOptional({
    example: "Hardware",
    description:
      "When changed, effective (category, subcategory) must be an active Admin taxonomy pair",
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string;

  @ApiPropertyOptional({
    example: "Laptop/Desktop",
    description:
      "When changed, effective (category, subcategory) must be an active Admin taxonomy pair",
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  subcategory?: string;

  @ApiPropertyOptional({ enum: IMPACT_URGENCY })
  @IsOptional()
  @IsIn([...IMPACT_URGENCY])
  impact?: (typeof IMPACT_URGENCY)[number];

  @ApiPropertyOptional({ enum: IMPACT_URGENCY })
  @IsOptional()
  @IsIn([...IMPACT_URGENCY])
  urgency?: (typeof IMPACT_URGENCY)[number];

  @ApiPropertyOptional({
    enum: ["New", "Assigned", "InProgress", "Resolved", "Closed"],
    description: "Reopened is only set via POST /incidents/:id/reopen",
  })
  @IsOptional()
  @IsIn(["New", "Assigned", "InProgress", "Resolved", "Closed"])
  status?: "New" | "Assigned" | "InProgress" | "Resolved" | "Closed";

  @ApiPropertyOptional({
    format: "uuid",
    nullable: true,
    description: "Prefer POST /incidents/:id/assign for assignment + email",
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  assignedTo?: string | null;

  @ApiPropertyOptional({
    description: "Required when transitioning to Resolved",
    minLength: 5,
    maxLength: 10_000,
  })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(10_000)
  resolutionNotes?: string;
}

export class AssignIncidentDto {
  @ApiProperty({
    format: "uuid",
    description: "Agent (or Admin) to assign; required — no auto-assignment",
  })
  @IsUUID()
  agentId!: string;
}

export class ReopenIncidentDto {
  @ApiProperty({
    description: "Why the ticket is being reopened (shown to the assignee)",
    minLength: 5,
    maxLength: 4000,
  })
  @IsString()
  @MinLength(5)
  @MaxLength(4000)
  reason!: string;
}

export class CreateCommentDto {
  @ApiProperty({ minLength: 1, maxLength: 4000 })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content!: string;
}
