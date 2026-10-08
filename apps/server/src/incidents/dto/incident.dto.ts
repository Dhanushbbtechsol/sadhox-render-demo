import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from "class-validator";
import { ProjectScopeFieldsDto } from "../../common/dto/project-scope.dto";
import {
  INCIDENT_CATEGORIES,
  isValidIncidentCategoryPair,
} from "../incident-categories";

const IMPACT_URGENCY = ["High", "Medium", "Low"] as const;

@ValidatorConstraint({ name: "incidentCategorySubcategory", async: false })
export class IncidentCategorySubcategoryConstraint
  implements ValidatorConstraintInterface
{
  validate(_value: unknown, args: ValidationArguments): boolean {
    const obj = args.object as { category?: string; subcategory?: string };
    if (!obj.category || !obj.subcategory) return true;
    return isValidIncidentCategoryPair(obj.category, obj.subcategory);
  }

  defaultMessage(): string {
    return "subcategory must belong to the selected category";
  }
}

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

  @ApiProperty({ enum: INCIDENT_CATEGORIES })
  @IsIn([...INCIDENT_CATEGORIES])
  category!: (typeof INCIDENT_CATEGORIES)[number];

  @ApiProperty({
    description: "Must belong to the selected category (see Phase 7 map)",
  })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  @Validate(IncidentCategorySubcategoryConstraint)
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

  @ApiPropertyOptional({ enum: INCIDENT_CATEGORIES })
  @IsOptional()
  @IsIn([...INCIDENT_CATEGORIES])
  category?: (typeof INCIDENT_CATEGORIES)[number];

  @ApiPropertyOptional({
    description: "Must belong to category when both are sent",
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  @Validate(IncidentCategorySubcategoryConstraint)
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
