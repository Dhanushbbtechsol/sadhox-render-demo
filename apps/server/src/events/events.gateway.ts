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
import { and, eq } from "drizzle-orm";
import type { Server, Socket } from "socket.io";
import { ZodError } from "zod";
import { JWT_ACCESS_VERIFY_OPTIONS } from "../auth/jwt-access";
import { DRIZZLE } from "../database/database.constants";
import type { DrizzleDB } from "../database/database.module";
import { incidents, serviceRequests, users } from "../database/schema";
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
    tokenExp?: number;
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
    // Authenticate in middleware so the client "connect" event only fires after
    // user is attached — avoids race where join runs before handleConnection.
    server.use(async (socket, next) => {
      try {
        const { user, exp } = await this.authenticateSocket(
          socket as AuthedSocket,
        );
        const client = socket as AuthedSocket;
        client.data.user = user;
        client.data.tokenExp = exp;
        next();
      } catch (err) {
        const reason = err instanceof Error ? err.message : "unauthorized";
        this.logger.warn(`ws handshake rejected: ${reason}`);
        next(new Error(reason));
      }
    });
    this.logger.log("EventsGateway initialized");
  }

  async handleConnection(client: AuthedSocket) {
    const user = client.data.user;
    if (!user) {
      client.emit("error", { message: "Unauthorized" });
      client.disconnect(true);
      return;
    }
    this.scheduleTokenExpiryDisconnect(client, client.data.tokenExp);
    this.logger.log(`ws connected userId=${user.id} role=${user.role}`);
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
        algorithms: [...JWT_ACCESS_VERIFY_OPTIONS.algorithms],
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
    await this.assertCanJoinTicketRoom(user, ticketId);

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
   * Room ACL: Admin/Agent may join any ticket room. EndUser may join only when
   * the id is an incident they reported or a service request they submitted.
   * Unknown tickets and other users' tickets are default-deny.
   */
  async assertCanJoinTicketRoom(user: SocketUser, ticketId: string) {
    if (user.role === "Admin" || user.role === "Agent") {
      return;
    }

    if (user.role === "EndUser") {
      const [ownedIncident] = await this.db
        .select({ id: incidents.id })
        .from(incidents)
        .where(
          and(eq(incidents.id, ticketId), eq(incidents.reporterId, user.id)),
        )
        .limit(1);
      if (ownedIncident) {
        return;
      }

      const [ownedRequest] = await this.db
        .select({ id: serviceRequests.id })
        .from(serviceRequests)
        .where(
          and(
            eq(serviceRequests.id, ticketId),
            eq(serviceRequests.requesterId, user.id),
          ),
        )
        .limit(1);
      if (ownedRequest) {
        return;
      }

      throw new WsException(
        "Forbidden: EndUser may only join rooms for their own tickets",
      );
    }

    throw new WsException("Forbidden: ticket room join denied");
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
