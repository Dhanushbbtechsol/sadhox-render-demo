import { Controller, Get } from "@nestjs/common";
import { Public } from "./decorators/public.decorator";

/** Test-only probe routes for database-unavailable HTTP specs. */
@Controller("probe")
export class DatabaseUnavailableProbeController {
  @Get("protected")
  protectedRoute() {
    return { ok: true };
  }

  @Public()
  @Get("throttled")
  throttledPublic() {
    return { ok: true };
  }
}
