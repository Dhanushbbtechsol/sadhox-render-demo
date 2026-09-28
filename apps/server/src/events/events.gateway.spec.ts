import { describe, expect, it, vi } from "vitest";
import { WsException } from "@nestjs/websockets";
import {
  extractHandshakeToken,
  msUntilJwtExpiry,
  parseTicketRoomPayload,
  ticketRoomName,
} from "./ws-auth.util";
import { EventsGateway } from "./events.gateway";
import type { EventsService } from "./events.service";

describe("ws-auth.util", () => {
  it("extracts token from handshake.auth only by default", () => {
    expect(
      extractHandshakeToken({
        auth: { token: " abc.def.ghi " },
        query: { token: "query-token" },
      }),
    ).toBe("abc.def.ghi");
  });

  it("ignores query.token unless allowQueryToken is set", () => {
    expect(
      extractHandshakeToken({ auth: {}, query: { token: "query-token" } }),
    ).toBeUndefined();
    expect(
      extractHandshakeToken(
        { auth: {}, query: { token: "query-token" } },
        { allowQueryToken: true },
      ),
    ).toBe("query-token");
  });

  it("returns undefined when token missing", () => {
    expect(extractHandshakeToken({ auth: {}, query: {} })).toBeUndefined();
  });

  it("computes ms until JWT exp", () => {
    const now = 1_000_000;
    expect(msUntilJwtExpiry(undefined, now)).toBe(0);
    expect(msUntilJwtExpiry(900, now)).toBe(0); // already expired
    expect(msUntilJwtExpiry(1001, now)).toBe(1000);
  });

  it("parses ticket room payload", () => {
    const id = "11111111-1111-1111-1111-111111111111";
    expect(parseTicketRoomPayload({ ticketId: id })).toEqual({ ticketId: id });
    expect(ticketRoomName(id)).toBe(`ticket:${id}`);
  });

  it("rejects empty ticketId", () => {
    expect(() => parseTicketRoomPayload({ ticketId: "" })).toThrow();
  });
});

describe("EventsGateway auth handshake", () => {
  const userRow = {
    id: "11111111-1111-1111-1111-111111111111",
    email: "admin@sadhox.local",
    role: "Admin",
    name: "Ian Admin",
    passwordHash: "x",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  function buildGateway(opts: {
    verify?: ReturnType<typeof vi.fn>;
    selectRows?: unknown[][];
    nodeEnv?: string;
  }) {
    const verify =
      opts.verify ??
      vi.fn().mockResolvedValue({
        sub: userRow.id,
        email: userRow.email,
        role: "Admin",
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
    const jwt = { verifyAsync: verify };
    const config = {
      getOrThrow: vi.fn((k: string) => {
        if (k === "JWT_ACCESS_SECRET") return "test-access-secret-16";
        throw new Error(k);
      }),
      get: vi.fn((k: string) => {
        if (k === "NODE_ENV") return opts.nodeEnv ?? "test";
        return undefined;
      }),
    };
    const queue = [...(opts.selectRows ?? [[userRow]])];
    const limit = vi.fn(async () => queue.shift() ?? []);
    const where = vi.fn(() => ({ limit }));
    const from = vi.fn(() => ({ where }));
    const select = vi.fn(() => ({ from }));
    const db = { select };
    const events = { setServer: vi.fn() } as unknown as EventsService;

    const gateway = new EventsGateway(
      jwt as never,
      config as never,
      events,
      db as never,
    );
    return { gateway, verify, config };
  }

  function mockClient(handshake: {
    auth?: Record<string, unknown>;
    query?: Record<string, unknown>;
  }) {
    return {
      handshake,
      data: {} as {
        user?: { id: string; role: string };
        tokenExpiryTimer?: ReturnType<typeof setTimeout>;
      },
      emit: vi.fn(),
      disconnect: vi.fn(),
      join: vi.fn().mockResolvedValue(undefined),
      leave: vi.fn().mockResolvedValue(undefined),
    };
  }

  it("accepts a valid access token from auth.token and attaches user", async () => {
    const { gateway } = buildGateway({});
    const client = mockClient({ auth: { token: "valid.jwt.token" } });
    await gateway.handleConnection(client as never);
    expect(client.data.user).toEqual({ id: userRow.id, role: "Admin" });
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it("rejects query.token outside development", async () => {
    const { gateway } = buildGateway({ nodeEnv: "production" });
    const client = mockClient({ auth: {}, query: { token: "only-query" } });
    await gateway.handleConnection(client as never);
    expect(client.disconnect).toHaveBeenCalledWith(true);
  });

  it("allows query.token in development", async () => {
    const { gateway } = buildGateway({ nodeEnv: "development" });
    const client = mockClient({ auth: {}, query: { token: "dev-query" } });
    await gateway.handleConnection(client as never);
    expect(client.data.user).toEqual({ id: userRow.id, role: "Admin" });
  });

  it("rejects missing token", async () => {
    const { gateway } = buildGateway({});
    const client = mockClient({ auth: {}, query: {} });
    await gateway.handleConnection(client as never);
    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(client.data.user).toBeUndefined();
  });

  it("rejects invalid or expired token", async () => {
    const { gateway } = buildGateway({
      verify: vi.fn().mockRejectedValue(new Error("jwt expired")),
    });
    const client = mockClient({ auth: { token: "bad.token" } });
    await gateway.handleConnection(client as never);
    expect(client.disconnect).toHaveBeenCalledWith(true);
  });

  it("schedules disconnect at JWT exp and clears timer on disconnect", async () => {
    vi.useFakeTimers();
    try {
      const exp = Math.floor(Date.now() / 1000) + 2;
      const { gateway } = buildGateway({
        verify: vi.fn().mockResolvedValue({
          sub: userRow.id,
          email: userRow.email,
          role: "Admin",
          exp,
        }),
      });
      const client = mockClient({ auth: { token: "valid.jwt.token" } });
      await gateway.handleConnection(client as never);
      expect(client.data.tokenExpiryTimer).toBeDefined();
      expect(client.disconnect).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(2000);
      expect(client.disconnect).toHaveBeenCalledWith(true);

      // Fresh connection with a future exp (relative to faked now)
      const exp2 = Math.floor(Date.now() / 1000) + 30;
      const { gateway: gateway2 } = buildGateway({
        verify: vi.fn().mockResolvedValue({
          sub: userRow.id,
          email: userRow.email,
          role: "Admin",
          exp: exp2,
        }),
      });
      const client2 = mockClient({ auth: { token: "valid.jwt.token" } });
      await gateway2.handleConnection(client2 as never);
      expect(client2.data.tokenExpiryTimer).toBeDefined();
      gateway2.handleDisconnect(client2 as never);
      expect(client2.data.tokenExpiryTimer).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("EventsGateway room join/leave", () => {
  const ticketId = "22222222-2222-2222-2222-222222222222";

  function buildAuthedGateway() {
    const jwt = { verifyAsync: vi.fn() };
    const config = {
      getOrThrow: vi.fn(() => "test-access-secret-16"),
      get: vi.fn(() => "test"),
    };
    const db = { select: vi.fn() };
    const events = { setServer: vi.fn() } as unknown as EventsService;
    const gateway = new EventsGateway(
      jwt as never,
      config as never,
      events,
      db as never,
    );
    return gateway;
  }

  it("joins ticket room when payload is valid for Admin", async () => {
    const gateway = buildAuthedGateway();
    const client = {
      data: { user: { id: "u1", role: "Admin" } },
      join: vi.fn().mockResolvedValue(undefined),
      leave: vi.fn(),
    };
    const result = await gateway.handleJoin(client as never, { ticketId });
    expect(client.join).toHaveBeenCalledWith(`ticket:${ticketId}`);
    expect(result).toEqual({ ok: true, room: `ticket:${ticketId}` });
  });

  it("denies EndUser ticket room join until Phase 3 ownership", async () => {
    const gateway = buildAuthedGateway();
    const client = {
      data: { user: { id: "u2", role: "EndUser" } },
      join: vi.fn(),
    };
    await expect(
      gateway.handleJoin(client as never, { ticketId }),
    ).rejects.toBeInstanceOf(WsException);
    expect(client.join).not.toHaveBeenCalled();
  });

  it("leaves ticket room when payload is valid", async () => {
    const gateway = buildAuthedGateway();
    const client = {
      data: { user: { id: "u1", role: "Agent" } },
      join: vi.fn(),
      leave: vi.fn().mockResolvedValue(undefined),
    };
    const result = await gateway.handleLeave(client as never, { ticketId });
    expect(client.leave).toHaveBeenCalledWith(`ticket:${ticketId}`);
    expect(result).toEqual({ ok: true, room: `ticket:${ticketId}` });
  });

  it("rejects join without auth", async () => {
    const gateway = buildAuthedGateway();
    const client = {
      data: {},
      join: vi.fn(),
    };
    await expect(
      gateway.handleJoin(client as never, { ticketId }),
    ).rejects.toBeInstanceOf(WsException);
  });

  it("rejects join with invalid ticketId", async () => {
    const gateway = buildAuthedGateway();
    const client = {
      data: { user: { id: "u1", role: "Admin" } },
      join: vi.fn(),
    };
    await expect(
      gateway.handleJoin(client as never, { ticketId: "" }),
    ).rejects.toBeInstanceOf(WsException);
  });
});
