import { ApiProperty } from "@nestjs/swagger";
import { IsIn } from "class-validator";
import type { UserRole } from "../../common/types/roles";

const ROLES = ["Admin", "Agent", "EndUser", "Manager"] as const satisfies readonly UserRole[];

export class UpdateUserRoleDto {
  @ApiProperty({ enum: ROLES })
  @IsIn(ROLES)
  role!: UserRole;
}
