import { neutralizeFormula } from "./normalize";

export function csvEscapeCell(value: string | number): string {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    return String(value);
  }
  const text = neutralizeFormula(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** UTF-8 BOM + CRLF + RFC 4180. */
export function buildCsvDocument(
  headers: readonly string[],
  rows: Array<Array<string | number>>,
): string {
  const colCount = headers.length;
  const lines: string[] = [headers.map((h) => csvEscapeCell(h)).join(",")];
  for (const row of rows) {
    if (row.length !== colCount) {
      throw new Error(
        `CSV row has ${row.length} columns; expected ${colCount}`,
      );
    }
    lines.push(row.map((cell) => csvEscapeCell(cell)).join(","));
  }
  if (rows.length === 0) {
    lines.push(
      Array.from({ length: colCount }, (_, i) =>
        i === 0 ? csvEscapeCell("No records in range") : "",
      ).join(","),
    );
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
