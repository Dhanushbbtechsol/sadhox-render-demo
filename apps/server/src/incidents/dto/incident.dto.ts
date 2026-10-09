import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  Validate,
  ValidateIf,
  ValidatorConstraint,
  type ValidationArguments,
  type ValidatorConstraintInterface,
} from "class-validator";
import { ProjectScopeFieldsDto } from "../../common/dto/project-scope.dto";
import {
  INCIDENT_CATEGORIES,
  isValidIncidentCategorySubcategory,
  subcategoriesForCategory,
} from "../incident-category-map";

const IMPACT_URGENCY = ["High", "Medium", "Low"] as const;

@ValidatorConstraint({ name: "isIncidentCategorySubcategoryPair", async: false })
class IsIncidentCategorySubcategoryPairConstraint
  implements ValidatorConstraintInterface
{
  validate(subcategory: string, args: ValidationArguments) {
    const obj = args.object as { category?: string };
    if (!obj.category || typeof subcategory !== "string") return false;
    return isValidIncidentCategorySubcategory(obj.category, subcategory);
  }

  defaultMessage(args: ValidationArguments) {
    const obj = args.object as { category?: string };
    const category = obj.category ?? "";
    const allowed = subcategoriesForCategory(category);
    if (!allowed) {
      return `category must be one of: ${INCIDENT_CATEGORIES.join(", ")}`;
    }
    return `subcategory must be one of: ${allowed.join(", ")} for category "${category}"`;
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

  @ApiProperty({
    enum: INCIDENT_CATEGORIES,
    description: "Phase 7 incident category (see INCIDENT_CATEGORY_SUBCATEGORY_MAP)",
  })
  @IsIn([...INCIDENT_CATEGORIES])
  category!: (typeof INCIDENT_CATEGORIES)[number];

  @ApiProperty({
    example: "Laptop/Desktop",
    description:
      "Required subcategory belonging to the selected category (INCIDENT_CATEGORY_SUBCATEGORY_MAP)",
  })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  @Validate(IsIncidentCategorySubcategoryPairConstraint)
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

  /**
   * Optional. Pair validation against the Phase 7 map runs in the service on
   * the effective values only when category or subcategory actually changes
   * vs the stored row (legacy category / "Other" re-sends are allowed).
   */
  @ApiPropertyOptional({
    enum: INCIDENT_CATEGORIES,
    description:
      "When changed, effective (category, subcategory) must be a valid map pair",
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string;

  @ApiPropertyOptional({
    example: "Laptop/Desktop",
    description:
      "When changed, effective (category, subcategory) must be a valid map pair. Must belong to category when both are sent.",
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

export class CreateCommentDto {
  @ApiProperty({ minLength: 1, maxLength: 4000 })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content!: string;
}
