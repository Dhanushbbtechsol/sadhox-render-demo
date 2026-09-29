import { Inject, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from "@nestjs/websockets";
import { eq } from "drizzle-orm";
import type { Server, Socket } from "socket.io";
import { ZodError } from "zod";
import { DRIZZLE } from "../database/database.constants";
import type { DrizzleDB } from "../database/database.module";
import { users } from "../database/schema";
import { EventsService } from "./events.service";
import {
  extractHandshakeToken,
  msUntilJwtExpiry,
  parseTicketRoomPayload,
  ticketRoomName,
  type JwtAccessPayload,
  type SocketUser,
} from "./ws-auth.util";

type AuthedSocket = Socket & {
  data: {
    user?: SocketUser;
    tokenExpiryTimer?: ReturnType<typeof setTimeout>;
  };
};

/** CORS is applied via CorsIoAdapter in main.ts (ConfigService), not here. */
@WebSocketGateway()
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly events: EventsService,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
  ) {}

  afterInit(server: Server) {
    this.events.setServer(server);
    this.logger.log("EventsGateway initialized");
  }

  async handleConnection(client: AuthedSocket) {
    try {
      const { user, exp } = await this.authenticateSocket(client);
      client.data.user = user;
      this.scheduleTokenExpiryDisconnect(client, exp);
      this.logger.log(`ws connected userId=${user.id} role=${user.role}`);
    } catch (err) {
      const reason = err instanceof Error ? err.message : "unauthorized";
      this.logger.warn(`ws rejected: ${reason}`);
      client.emit("error", { message: "Unauthorized" });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthedSocket) {
    this.clearTokenExpiryTimer(client);
    const userId = client.data.user?.id ?? "unknown";
    this.logger.log(`ws disconnected userId=${userId}`);
  }

  /**
   * Verify JWT access token from handshake and load live user/role from DB
   * (same secret + DB role preference as JwtStrategy).
   */
  async authenticateSocket(
    client: AuthedSocket,
  ): Promise<{ user: SocketUser; exp?: number }> {
    const allowQueryToken =
      this.config.get<string>("NODE_ENV") === "development";
    const token = extractHandshakeToken(client.handshake, { allowQueryToken });
    if (!token) {
      throw new WsException("Missing access token");
    }

    let payload: JwtAccessPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtAccessPayload>(token, {
        secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
      });
    } catch {
      throw new WsException("Invalid or expired access token");
    }

    if (!payload?.sub) {
      throw new WsException("Invalid access token payload");
    }

    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1);

    if (!user) {
      throw new WsException("User not found or revoked");
    }

    return { user: { id: user.id, role: user.role }, exp: payload.exp };
  }

  /** Disconnect when access token expires; timer cleared on disconnect. */
  scheduleTokenExpiryDisconnect(client: AuthedSocket, exp?: number) {
    this.clearTokenExpiryTimer(client);
    const delay = msUntilJwtExpiry(exp);
    if (delay <= 0) {
      client.emit("error", { message: "Access token expired" });
      client.disconnect(true);
      return;
    }
    client.data.tokenExpiryTimer = setTimeout(() => {
      this.logger.log(
        `ws token expired userId=${client.data.user?.id ?? "unknown"}`,
      );
      client.emit("error", { message: "Access token expired" });
      client.disconnect(true);
    }, delay);
  }

  clearTokenExpiryTimer(client: AuthedSocket) {
    if (client.data.tokenExpiryTimer) {
      clearTimeout(client.data.tokenExpiryTimer);
      client.data.tokenExpiryTimer = undefined;
    }
  }

  @SubscribeMessage("join")
  async handleJoin(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: unknown,
  ) {
    const user = this.requireAuthed(client);
    const { ticketId } = this.parseRoomBody(body);
    this.assertCanJoinTicketRoom(user);

    const room = ticketRoomName(ticketId);
    await client.join(room);
    return { ok: true, room };
  }

  @SubscribeMessage("leave")
  async handleLeave(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: unknown,
  ) {
    this.requireAuthed(client);
    const { ticketId } = this.parseRoomBody(body);
    const room = ticketRoomName(ticketId);
    await client.leave(room);
    return { ok: true, room };
  }

  /**
   * Interim room ACL until Phase 3 ticket ownership exists.
   * Admin/Agent may join any ticket room. EndUser is denied — we cannot
   * prove ownership while tickets are stubs (default-deny for EndUser).
   * TODO(Phase 3): replace with ownership / visibility checks on real tickets.
   */
  assertCanJoinTicketRoom(user: SocketUser) {
    if (user.role === "Admin" || user.role === "Agent") {
      return;
    }
    throw new WsException(
      "Forbidden: ticket room join requires Admin/Agent until ownership checks land (Phase 3)",
    );
  }

  private requireAuthed(client: AuthedSocket): SocketUser {
    const user = client.data.user;
    if (!user) {
      throw new WsException("Unauthorized");
    }
    return user;
  }

  private parseRoomBody(body: unknown): { ticketId: string } {
    try {
      return parseTicketRoomPayload(body);
    } catch (err) {
      if (err instanceof ZodError) {
        throw new WsException(err.issues[0]?.message ?? "Invalid payload");
      }
      throw new WsException("Invalid payload");
    }
  }
}
