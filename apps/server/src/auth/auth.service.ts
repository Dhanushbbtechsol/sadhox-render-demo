import {
  Injectable,
  Inject,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { and, eq } from "drizzle-orm";
import {
  isDatabaseUnavailableError,
  throwIfDatabaseUnavailable,
} from "../common/database-unavailable";
import { DRIZZLE } from "../database/database.constants";
import type { DrizzleDB } from "../database/database.module";
import { auditLog, refreshTokens, users, type User } from "../database/schema";
import { JWT_ACCESS_SIGN_OPTIONS } from "./jwt-access";

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MISSING_USER_HASH = bcrypt.hashSync("sadhox-missing-user", 12);

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<User> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    const ok = await bcrypt.compare(
      password,
      user?.passwordHash ?? MISSING_USER_HASH,
    );
    if (!user || !ok) {
      throw new UnauthorizedException("Invalid credentials");
    }
    return user;
  }

  hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  createAccessToken(user: Pick<User, "id" | "email" | "role" | "name">): string {
    return this.jwt.sign(
      { sub: user.id, email: user.email, role: user.role, name: user.name },
      {
        secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
        expiresIn: JWT_ACCESS_SIGN_OPTIONS.expiresIn,
        algorithm: JWT_ACCESS_SIGN_OPTIONS.algorithm,
      },
    );
  }

  generateRefreshToken(): { raw: string; hash: string; expiresAt: Date } {
    const raw = randomBytes(48).toString("hex");
    const hash = this.hashToken(raw);
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
    return { raw, hash, expiresAt };
  }

  hashToken(raw: string): string {
    return createHash("sha256").update(raw).digest("hex");
  }

  async persistRefreshToken(userId: string, tokenHash: string, expiresAt: Date) {
    await this.db.insert(refreshTokens).values({
      userId,
      tokenHash,
      expiresAt,
    });
  }

  private async recordAuthFailure(email: string, ip: string | undefined, reason: string) {
    this.logger.warn(`auth_failure email=${email} ip=${ip ?? "unknown"} reason=${reason}`);
    try {
      await this.db.insert(auditLog).values({
        actorId: null,
        action: "auth.login_failed",
        entityType: "auth",
        entityId: null,
        diff: { email, ip: ip ?? null, reason },
      });
    } catch (err) {
      this.logger.error("Failed to write auth failure audit_log", err);
    }
  }

  async login(email: string, password: string, ip?: string) {
    try {
      const user = await this.validateUser(email, password);
      const accessToken = this.createAccessToken(user);
      const refresh = this.generateRefreshToken();
      await this.persistRefreshToken(user.id, refresh.hash, refresh.expiresAt);
      return {
        accessToken,
        refreshToken: refresh.raw,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      };
    } catch (err) {
      if (isDatabaseUnavailableError(err)) {
        throwIfDatabaseUnavailable(err);
      }
      await this.recordAuthFailure(email.toLowerCase(), ip, "invalid_credentials");
      throw err;
    }
  }

  async refresh(rawRefreshToken: string) {
    if (!rawRefreshToken) {
      throw new UnauthorizedException("Missing refresh token");
    }
    try {
      const tokenHash = this.hashToken(rawRefreshToken);
      const [stored] = await this.db
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.tokenHash, tokenHash))
        .limit(1);

      if (!stored || stored.revoked || stored.expiresAt < new Date()) {
        throw new UnauthorizedException("Invalid refresh token");
      }

      await this.db
        .update(refreshTokens)
        .set({ revoked: true })
        .where(eq(refreshTokens.id, stored.id));

      const [user] = await this.db
        .select()
        .from(users)
        .where(eq(users.id, stored.userId))
        .limit(1);
      if (!user) {
        throw new UnauthorizedException("User not found");
      }

      const accessToken = this.createAccessToken(user);
      const next = this.generateRefreshToken();
      await this.persistRefreshToken(user.id, next.hash, next.expiresAt);

      return {
        accessToken,
        refreshToken: next.raw,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      };
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throwIfDatabaseUnavailable(err);
    }
  }

  async logout(rawRefreshToken: string | undefined) {
    if (!rawRefreshToken) {
      return;
    }
    const tokenHash = this.hashToken(rawRefreshToken);
    await this.db
      .update(refreshTokens)
      .set({ revoked: true })
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          eq(refreshTokens.revoked, false),
        ),
      );
  }
}
