import { ExecutionContext, Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

/**
 * Global throttle is HTTP-only. Socket.IO has no Express `res.header`, and
 * WS auth/room ACL already live in EventsGateway.
 */
@Injectable()
export class HttpThrottlerGuard extends ThrottlerGuard {
  canActivate(context: ExecutionContext) {
    if (context.getType() !== "http") {
      return Promise.resolve(true);
    }
    return super.canActivate(context);
  }
}
