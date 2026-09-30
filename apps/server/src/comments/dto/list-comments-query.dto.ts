import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsUUID } from "class-validator";
import {
  COMMENT_TICKET_TYPES,
  type CommentTicketType,
} from "./create-comment.dto";

export class ListCommentsQueryDto {
  @ApiProperty({ enum: COMMENT_TICKET_TYPES })
  @IsIn([...COMMENT_TICKET_TYPES])
  ticketType!: CommentTicketType;

  @ApiProperty({ format: "uuid" })
  @IsUUID()
  ticketId!: string;
}
