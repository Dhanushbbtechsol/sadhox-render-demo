import { Injectable, UnauthorizedException, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { eq } from "drizzle-orm";
import type { AuthUser } from "../../common/decorators/current-user.decorator";
import { throwIfDatabaseUnavailable } from "../../common/database-unavailable";
import { DRIZZLE } from "../../database/database.constants";
import type { DrizzleDB } from "../../database/database.module";
import { users } from "../../database/schema";

type JwtPayload = {
  sub: string;
  email: string;
  role: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    config: ConfigService,
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("JWT_ACCESS_SECRET"),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    try {
      const [user] = await this.db
        .select()
        .from(users)
        .where(eq(users.id, payload.sub))
        .limit(1);
      if (!user) {
        throw new UnauthorizedException("User not found or revoked");
      }
      // Prefer live DB role over JWT claim (role changes take effect within token TTL on next request)
      return {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      };
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throwIfDatabaseUnavailable(err);
    }
  }
}
