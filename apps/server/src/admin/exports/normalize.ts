/** Prefix so spreadsheet apps do not execute formulas. */
export function neutralizeFormula(value: string): string {
  if (value.length === 0) return value;
  const first = value[0]!;
  if (
    first === "=" ||
    first === "+" ||
    first === "-" ||
    first === "@" ||
    first === "\t" ||
    first === "\r"
  ) {
    return `'${value}`;
  }
  return value;
}

export function formatBool(value: boolean | null | undefined): string {
  if (value == null) return "";
  return value ? "Yes" : "No";
}

/** CSV empty; Excel display uses em dash via displayNullExcel. */
export function displayNullCsv(value: string | null | undefined): string {
  return value == null || value === "" ? "" : value;
}

export function displayNullExcel(value: string | null | undefined): string {
  return value == null || value === "" ? "—" : value;
}

/** ISO-like UTC for CSV: YYYY-MM-DD HH:mm (seconds omitted per proposal). */
export function formatCsvDateUtc(
  value: Date | string | null | undefined,
): string {
  if (value == null || value === "") return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

/** Keep seconds for parity with legacy ticket CSV where needed. */
export function formatCsvDateUtcFull(
  value: Date | string | null | undefined,
): string {
  if (value == null || value === "") return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

export function parseDate(
  value: Date | string | null | undefined,
): Date | null {
  if (value == null || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function stripUtcSuffix(header: string): string {
  return header.replace(/ \(UTC\)$/i, "");
}
