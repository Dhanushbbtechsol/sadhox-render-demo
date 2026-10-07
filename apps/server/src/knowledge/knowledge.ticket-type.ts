import { BadRequestException } from "@nestjs/common";
import {
  KNOWLEDGE_LINK_TICKET_TYPES,
  type KnowledgeLinkTicketType,
} from "./dto/knowledge.dto";

export function parseLinkTicketType(value: string): KnowledgeLinkTicketType {
  if (
    (KNOWLEDGE_LINK_TICKET_TYPES as readonly string[]).includes(value)
  ) {
    return value as KnowledgeLinkTicketType;
  }
  throw new BadRequestException(
    `ticketType must be one of: ${KNOWLEDGE_LINK_TICKET_TYPES.join(", ")}`,
  );
}
