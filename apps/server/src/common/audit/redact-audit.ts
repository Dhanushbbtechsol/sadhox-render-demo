/** Deep-redact sensitive keys before any audit_log persistence. */
const SENSITIVE_KEY =
  /^(password|token|refreshToken|authorization|cookie|purchaseCost|purchase_cost|.*secret.*)$/i;

/** Max JSON size for audit_log.diff (bytes, UTF-8). */
export const AUDIT_DIFF_MAX_BYTES = 8_192;

export function redactAuditValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactAuditValue(item));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(
      value as Record<string, unknown>,
    )) {
      if (SENSITIVE_KEY.test(key)) {
        out[key] = "[REDACTED]";
      } else {
        out[key] = redactAuditValue(nested);
      }
    }
    return out;
  }
  return value;
}

/**
 * Cap persisted diff size after redaction. Truncates with an explicit marker
 * so large bodies cannot bloat audit_log.
 */
export function capAuditDiff(value: unknown): unknown {
  const json = JSON.stringify(value ?? null);
  if (json === undefined) {
    return null;
  }
  const bytes = Buffer.byteLength(json, "utf8");
  if (bytes <= AUDIT_DIFF_MAX_BYTES) {
    return value;
  }
  return {
    truncated: true,
    originalBytes: bytes,
    maxBytes: AUDIT_DIFF_MAX_BYTES,
    preview: json.slice(0, Math.min(json.length, 500)) + "…[TRUNCATED]",
  };
}
