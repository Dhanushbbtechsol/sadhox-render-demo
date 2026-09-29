import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsUUID } from "class-validator";

export class LinkTicketDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID()
  ticketId!: string;

  @ApiProperty({ enum: ["incident", "service_request"] })
  @IsIn(["incident", "service_request"])
  ticketType!: "incident" | "service_request";
}
