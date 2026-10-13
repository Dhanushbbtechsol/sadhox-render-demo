import { sql } from "drizzle-orm";
import type { DrizzleDB } from "../database/database.module";
import { referenceCounters } from "../database/schema";

export type ReferencePrefix =
  | "INC"
  | "ISS"
  | "REQ"
  | "CHG"
  | "AST"
  | "USR"
  | "PRJ";

export type ReferenceCounters = Readonly<Record<string, number>>;

export function emptyCounters(): ReferenceCounters {
  return {};
}

export function formatReference(prefix: ReferencePrefix, sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error(`reference sequence must be a positive integer, received ${sequence}`);
  }
  return `${prefix}-${String(sequence).padStart(6, "0")}`;
}

export function allocateReference(
  counters: ReferenceCounters,
  prefix: ReferencePrefix,
): { counters: ReferenceCounters; reference: string } {
  const sequence = (counters[prefix] ?? 0) + 1;
  return {
    counters: { ...counters, [prefix]: sequence },
    reference: formatReference(prefix, sequence),
  };
}

type ClaimDb = Pick<DrizzleDB, "insert">;

export async function claimReference(
  db: ClaimDb,
  prefix: ReferencePrefix,
): Promise<string> {
  const [row] = await db
    .insert(referenceCounters)
    .values({ prefix, value: 1 })
    .onConflictDoUpdate({
      target: referenceCounters.prefix,
      set: { value: sql`${referenceCounters.value} + 1` },
    })
    .returning();
  if (!row) {
    throw new Error(`reference counter returned no row for ${prefix}`);
  }
  return formatReference(prefix, row.value);
}
