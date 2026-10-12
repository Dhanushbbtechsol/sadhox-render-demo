/** Shown on screen. Falls back to a short id only when a row has no reference yet. */
export function recordReference(
  referenceCode: string | null | undefined,
  id: string,
): string {
  if (referenceCode && referenceCode.length > 0) return referenceCode;
  return id.slice(0, 8);
}
