import { Injectable } from "@nestjs/common";
import { EventsGateway } from "./events.gateway";

@Injectable()
export class EventsService {
  constructor(private readonly gateway: EventsGateway) {}

  emitCommentCreated(ticketId: string, payload: unknown) {
    this.gateway.emitToTicket(ticketId, "comment.created", payload);
  }

  emitTicketUpdated(ticketId: string, payload: unknown) {
    this.gateway.emitToTicket(ticketId, "ticket.updated", payload);
  }
}
