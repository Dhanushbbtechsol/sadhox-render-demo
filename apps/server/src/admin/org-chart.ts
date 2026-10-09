import { BadRequestException } from "@nestjs/common";
import type { UserRole } from "../common/types/roles";

const ALLOWED_MANAGER_ROLES: ReadonlySet<UserRole> = new Set([
  "Manager",
  "Admin",
]);

/**
 * Phase 9 org chart: `reports_to_id` must point at a Manager or Admin, never self.
 * Call only when `reportsToId` is a non-null UUID.
 */
export function assertReportsTo(
  reportsToId: string,
  userId: string,
  reportsToRole: UserRole,
): void {
  if (reportsToId === userId) {
    throw new BadRequestException("User cannot report to themselves");
  }
  if (!ALLOWED_MANAGER_ROLES.has(reportsToRole)) {
    throw new BadRequestException(
      "reportsToId must reference a Manager or Admin",
    );
  }
}
