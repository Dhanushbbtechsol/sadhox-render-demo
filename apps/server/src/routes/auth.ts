/**
 * Temporary Phase 1 auth stubs so Dev A can hit Checkpoint 1 locally
 * while Dev D owns the production Nest/Hono auth implementation.
 */
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { sign, verify } from "hono/jwt";

type Role = "Admin" | "Agent" | "EndUser";

interface DemoUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  password: string;
}

const DEMO_USERS: DemoUser[] = [
  {
    id: "user-agent-1",
    email: "agent@sadhox.local",
    name: "Alice Agent",
    role: "Agent",
    password: "password",
  },
  {
    id: "user-end-1",
    email: "user@sadhox.local",
    name: "Eve EndUser",
    role: "EndUser",
    password: "password",
  },
  {
    id: "user-admin-1",
    email: "admin@sadhox.local",
    name: "Ian Admin",
    role: "Admin",
    password: "password",
  },
];

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-change-me";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret-change-me";
const ACCESS_TTL_SECONDS = 60 * 15;
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 7;

function publicUser(user: DemoUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export async function authenticateAccessToken(authorization: string | undefined) {
  const token = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";
  if (!token) return null;

  try {
    const payload = await verify(token, ACCESS_SECRET, "HS256");
    if (payload.typ === "refresh" || typeof payload.sub !== "string") return null;
    const user = DEMO_USERS.find((entry) => entry.id === payload.sub);
    return user ? publicUser(user) : null;
  } catch {
    return null;
  }
}

async function issueTokens(user: DemoUser) {
  const now = Math.floor(Date.now() / 1000);
  const accessToken = await sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      exp: now + ACCESS_TTL_SECONDS,
    },
    ACCESS_SECRET,
    "HS256",
  );
  const refreshToken = await sign(
    {
      sub: user.id,
      typ: "refresh",
      exp: now + REFRESH_TTL_SECONDS,
    },
    REFRESH_SECRET,
    "HS256",
  );
  return { accessToken, refreshToken };
}

export const authRoutes = new Hono();

authRoutes.post("/login", async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>();
  const user = DEMO_USERS.find(
    (entry) => entry.email === body.email && entry.password === body.password,
  );

  if (!user) {
    return c.json({ message: "Invalid email or password" }, 401);
  }

  const { accessToken, refreshToken } = await issueTokens(user);
  setCookie(c, "refresh_token", refreshToken, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: REFRESH_TTL_SECONDS,
    secure: process.env.NODE_ENV === "production",
  });

  return c.json({ accessToken, user: publicUser(user) });
});

authRoutes.post("/refresh", async (c) => {
  const refreshToken = getCookie(c, "refresh_token");
  if (!refreshToken) {
    return c.json({ message: "Missing refresh token" }, 401);
  }

  try {
    const payload = await verify(refreshToken, REFRESH_SECRET, "HS256");
    const user = DEMO_USERS.find((entry) => entry.id === payload.sub);
    if (!user || payload.typ !== "refresh") {
      return c.json({ message: "Invalid refresh token" }, 401);
    }

    const tokens = await issueTokens(user);
    setCookie(c, "refresh_token", tokens.refreshToken, {
      httpOnly: true,
      sameSite: "Lax",
      path: "/",
      maxAge: REFRESH_TTL_SECONDS,
      secure: process.env.NODE_ENV === "production",
    });

    return c.json({ accessToken: tokens.accessToken, user: publicUser(user) });
  } catch {
    return c.json({ message: "Invalid or expired refresh token" }, 401);
  }
});

authRoutes.post("/logout", (c) => {
  deleteCookie(c, "refresh_token", { path: "/" });
  return c.json({ ok: true });
});
