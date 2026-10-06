import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import type { UserRole } from "../types/roles";
import type { AuthUser } from "../decorators/current-user.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Room ACL lives in EventsGateway; HTTP-only role metadata does not apply to WS.
    // Default to HTTP when getType is missing (unit-test ExecutionContext stubs).
    if (
      typeof context.getType === "function" &&
      context.getType() !== "http"
    ) {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    // Default-deny: authenticated routes must declare @Roles(...)
    if (!requiredRoles || requiredRoles.length === 0) {
      throw new ForbiddenException("Missing role requirements");
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;
    if (!user || !requiredRoles.includes(user.role as UserRole)) {
      throw new ForbiddenException("Insufficient role");
    }
    return true;
  }
}
