import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsUUID, MinLength } from "class-validator";

export class CreateProjectDto {
  @ApiProperty({ example: "Platform Ops" })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ format: "uuid", description: "Manager user id" })
  @IsUUID()
  managerId!: string;
}

export class CreateModuleDto {
  @ApiProperty({ example: "Billing" })
  @IsString()
  @MinLength(1)
  name!: string;
}

export class AddProjectMemberDto {
  @ApiProperty({ format: "uuid", description: "Agent user id" })
  @IsUUID()
  userId!: string;
}
