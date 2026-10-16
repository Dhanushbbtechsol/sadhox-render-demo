import { Injectable, Logger } from "@nestjs/common";
import type { Server } from "socket.io";
import { ticketRoomName } from "./ws-auth.util";

/**
 * Broadcast helpers for other Nest modules.
 * The gateway registers the Socket.IO server via setServer after init.
 */
@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  private server: Server | null = null;

  setServer(server: Server) {
    this.server = server;
  }

  emitCommentCreated(ticketId: string, payload: unknown) {
    if (!this.server) {
      this.logger.warn(
        `skip comment.created for ${ticketId}: Socket.IO not ready`,
      );
      return;
    }
    const room = ticketRoomName(ticketId);
    this.server.to(room).emit("comment.created", payload);
    this.logger.debug(`broadcast comment.created → ${room}`);
  }

  emitTicketUpdated(ticketId: string, payload: unknown) {
    if (!this.server) {
      this.logger.warn(
        `skip ticket.updated for ${ticketId}: Socket.IO not ready`,
      );
      return;
    }
    const room = ticketRoomName(ticketId);
    this.server.to(room).emit("ticket.updated", payload);
    this.logger.debug(`broadcast ticket.updated → ${room}`);
  }
}
