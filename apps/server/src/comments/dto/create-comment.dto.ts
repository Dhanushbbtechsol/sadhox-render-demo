import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export const COMMENT_TICKET_TYPES = [
  "incident",
  "problem",
  "service_request",
  "change",
] as const;

export type CommentTicketType = (typeof COMMENT_TICKET_TYPES)[number];

export class CreatePolymorphicCommentDto {
  @ApiProperty({ enum: COMMENT_TICKET_TYPES })
  @IsIn(COMMENT_TICKET_TYPES)
  ticketType!: CommentTicketType;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  ticketId!: string;

  @ApiProperty({ maxLength: 4000 })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content!: string;
}
