import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { Public } from "../common/decorators/public.decorator";
import { THROTTLE_AUTH_LOGIN } from "../common/throttle.constants";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RefreshCookieOriginGuard } from "./refresh-cookie-origin.guard";
import {
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
} from "./refresh-cookie";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  private setRefreshCookie(res: Response, token: string) {
    res.cookie(REFRESH_COOKIE_NAME, token, refreshCookieOptions());
  }

  private clearRefreshCookie(res: Response) {
    const { maxAge: _maxAge, ...clearOpts } = refreshCookieOptions();
    res.clearCookie(REFRESH_COOKIE_NAME, clearOpts);
  }

  @Public()
  @Throttle(THROTTLE_AUTH_LOGIN)
  @Post("login")
  @HttpCode(200)
  @ApiOperation({ summary: "Login with email/password" })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(dto.email, dto.password, req.ip);
    this.setRefreshCookie(res, result.refreshToken);
    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Public()
  @UseGuards(RefreshCookieOriginGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("refresh")
  @HttpCode(200)
  @ApiCookieAuth(REFRESH_COOKIE_NAME)
  @ApiOperation({ summary: "Rotate refresh token and issue new access token" })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const raw = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    const result = await this.auth.refresh(raw ?? "");
    this.setRefreshCookie(res, result.refreshToken);
    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Public()
  @UseGuards(RefreshCookieOriginGuard)
  @Post("logout")
  @HttpCode(200)
  @ApiOperation({ summary: "Revoke refresh token and clear cookie" })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const raw = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    await this.auth.logout(raw);
    this.clearRefreshCookie(res);
    return { ok: true };
  }
}
