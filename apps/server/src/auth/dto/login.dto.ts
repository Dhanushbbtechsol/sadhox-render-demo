import { IsEmail, IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LoginDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  email!: string;

  /** Login keeps length-only checks to avoid leaking complexity policy. */
  @ApiProperty({ example: "your-password", minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;
}
