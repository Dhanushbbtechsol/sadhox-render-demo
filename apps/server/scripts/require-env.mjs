/**
 * Shared helper for local ops scripts under apps/server/scripts.
 * Loads apps/server/.env (if present), then requires named env vars.
 * Never supplies host/port/credential fallbacks — missing vars exit 1.
 */
import "dotenv/config";

/**
 * @param {string[]} names
 * @returns {Record<string, string>}
 */
export function requireEnv(names) {
  /** @type {Record<string, string>} */
  const out = {};
  const missing = [];
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (!value) missing.push(name);
    else out[name] = value;
  }
  if (missing.length > 0) {
    console.error(
      [
        `Missing required environment variable(s): ${missing.join(", ")}`,
        "Set them explicitly (or in apps/server/.env). No LAN/host fallbacks.",
        "Example (local docker-compose ports):",
        '  DATABASE_URL=postgresql://sadhox:sadhox@127.0.0.1:5437/sadhox',
        "  REDIS_URL=redis://127.0.0.1:16379",
        "  node scripts/<script>.mjs",
      ].join("\n"),
    );
    process.exit(1);
  }
  return out;
}
