import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import type { UserRole } from "../../common/types/roles";

export const USER_ROLES = [
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

  @ApiProperty({ example: "ada@sadhox.local" })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ minLength: 12, maxLength: 128 })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;

  @ApiProperty({ enum: USER_ROLES })
  @IsIn(USER_ROLES)
  role!: UserRole;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ minLength: 12, maxLength: 128 })
  @IsOptional()
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password?: string;

  @ApiPropertyOptional({ enum: USER_ROLES })
  @IsOptional()
  @IsIn(USER_ROLES)
  role?: UserRole;
}
