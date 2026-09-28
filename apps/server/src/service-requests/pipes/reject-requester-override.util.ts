/** Pure check so RBAC rejection is testable without Nest ESM in Jest. */
export function hasRequesterOverride(body: unknown): boolean {
  return Boolean(
    body &&
      typeof body === "object" &&
      ("requesterId" in body || "requesterName" in body),
  );
}
