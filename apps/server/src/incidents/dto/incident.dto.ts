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

const IMPACT_URGENCY = ["High", "Medium", "Low"] as const;
const CATEGORIES = [
  "Hardware",
  "Software",
  "Network",
  "Access",
  "Email",
  "Other",
] as const;

export class CreateIncidentDto {
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

  @ApiProperty({ enum: CATEGORIES })
  @IsIn([...CATEGORIES])
  category!: (typeof CATEGORIES)[number];

  @ApiProperty({ enum: IMPACT_URGENCY })
  @IsIn([...IMPACT_URGENCY])
  impact!: (typeof IMPACT_URGENCY)[number];

  @ApiProperty({ enum: IMPACT_URGENCY })
  @IsIn([...IMPACT_URGENCY])
  urgency!: (typeof IMPACT_URGENCY)[number];

  @ApiPropertyOptional({
    format: "uuid",
    nullable: true,
    description: "Optional project scope (module must belong to this project)",
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  projectId?: string | null;

  @ApiPropertyOptional({
    format: "uuid",
    nullable: true,
    description: "Optional module; requires projectId",
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  moduleId?: string | null;
}

export class UpdateIncidentDto {
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

  @ApiPropertyOptional({ enum: CATEGORIES })
  @IsOptional()
  @IsIn([...CATEGORIES])
  category?: (typeof CATEGORIES)[number];

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

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  projectId?: string | null;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  moduleId?: string | null;
}

export class AssignIncidentDto {
  @ApiPropertyOptional({
    format: "uuid",
    description: "Omit for round-robin auto-assignment",
  })
  @IsOptional()
  @IsUUID()
  agentId?: string;
}

export class CreateCommentDto {
  @ApiProperty({ minLength: 1, maxLength: 4000 })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content!: string;
}
