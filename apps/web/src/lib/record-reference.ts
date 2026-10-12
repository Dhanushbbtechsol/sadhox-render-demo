/**
 * Shown on screen. Never falls back to a sliced id — a row with no
 * referenceCode yet renders the empty-state placeholder instead.
 */
export function recordReference(referenceCode: string | null | undefined): string {
  if (referenceCode && referenceCode.length > 0) return referenceCode;
  return "—";
}
