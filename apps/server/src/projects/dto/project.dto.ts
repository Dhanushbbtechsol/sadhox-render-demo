import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class CreateProjectDto {
  @ApiProperty({ example: "Campus Network" })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @ApiProperty({
    format: "uuid",
    description: "User with role Manager who owns this project",
  })
  @IsUUID()
  managerId!: string;
}

export class UpdateProjectDto {
  @ApiPropertyOptional({ example: "Campus Network" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    format: "uuid",
    description: "User with role Manager who owns this project",
  })
  @IsOptional()
  @IsUUID()
  managerId?: string;
}

export class AddProjectMemberDto {
  @ApiProperty({ format: "uuid", description: "Must be an Agent user" })
  @IsUUID()
  userId!: string;
}

export class CreateModuleDto {
  @ApiProperty({ example: "Wi-Fi" })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;
}

export class UpdateModuleDto {
  @ApiProperty({ example: "Wi-Fi Core" })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;
}
