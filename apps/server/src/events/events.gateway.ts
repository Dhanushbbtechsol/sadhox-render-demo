import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

type JwtPayload = {
  sub: string;
  email: string;
  role: string;
};

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
  namespace: "/",
})
export class EventsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.disconnect(true);
        return;
      }

      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
      });

      client.data.user = {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
      };
    } catch (error) {
      this.logger.warn(
        `Socket auth failed: ${error instanceof Error ? error.message : "unknown"}`,
      );
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Socket disconnected ${client.id}`);
  }

  @SubscribeMessage("join")
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { ticketId?: string },
  ) {
    if (!body?.ticketId) return { ok: false, error: "ticketId required" };
    const room = `ticket:${body.ticketId}`;
    void client.join(room);
    return { ok: true, room };
  }

  @SubscribeMessage("leave")
  handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { ticketId?: string },
  ) {
    if (!body?.ticketId) return { ok: false, error: "ticketId required" };
    const room = `ticket:${body.ticketId}`;
    void client.leave(room);
    return { ok: true, room };
  }

  emitToTicket(ticketId: string, event: string, payload: unknown) {
    if (!this.server) return;
    this.server.to(`ticket:${ticketId}`).emit(event, payload);
  }

  private extractToken(client: Socket): string | null {
    const auth = client.handshake.auth as { token?: string } | undefined;
    if (auth?.token) return auth.token;

    const header = client.handshake.headers.authorization;
    if (typeof header === "string" && header.startsWith("Bearer ")) {
      return header.slice(7);
    }

    const queryToken = client.handshake.query.token;
    if (typeof queryToken === "string") return queryToken;

    return null;
  }
}
