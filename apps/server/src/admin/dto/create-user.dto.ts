import { ApiProperty } from "@nestjs/swagger";
import {
  IsEmail,
  IsIn,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import type { UserRole } from "../../common/types/roles";

const ROLES = [
  "Admin",
  "Agent",
  "EndUser",
  "Manager",
] as const satisfies readonly UserRole[];

export class CreateUserDto {
  @ApiProperty({ maxLength: 255 })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @ApiProperty({ format: "email" })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({
    minLength: 12,
    description: "Must meet password complexity (12+ with upper/lower/digit/special)",
  })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;

  @ApiProperty({ enum: ROLES })
  @IsIn(ROLES)
  role!: UserRole;
}
