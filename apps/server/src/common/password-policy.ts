import { randomBytes } from "crypto";

/** Complexity rules for create/reset — not applied on login (avoids policy leaks). */
export function assertPasswordComplexity(password: string): void {
  if (password.length < 12) {
    throw new Error("Password must be at least 12 characters");
  }
  if (!/[a-z]/.test(password)) {
    throw new Error("Password must include a lowercase letter");
  }
  if (!/[A-Z]/.test(password)) {
    throw new Error("Password must include an uppercase letter");
  }
  if (!/[0-9]/.test(password)) {
    throw new Error("Password must include a digit");
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    throw new Error("Password must include a special character");
  }
}

export function generateSeedPassword(): string {
  // Readable one-time secret meeting complexity rules
  return `Sx-${randomBytes(18).toString("base64url")}!9A`;
}
