import ExcelJS from "exceljs";

import { neutralizeFormula, parseDate } from "./normalize";

export type MetaField = { label: string; value: string };

export type ColumnDef = {
  header: string;
  /** Group band label (merged across consecutive same-group columns). */
  group?: string;
  /** Force text cell (IDs, tags, serials). */
  text?: boolean;
  /** Date column — typed Excel date. */
  date?: boolean;
  /** Currency column. */
  currency?: boolean;
  width?: number;
};

export type SheetTable = {
  name: string;
  meta?: MetaField[];
  columns: ColumnDef[];
  rows: Array<Array<string | number | Date | null | undefined>>;
  freezeCols?: number;
};

const DATE_FMT = "yyyy-mm-dd hh:mm";
const CURRENCY_FMT = "₹#,##0.00";

function asText(value: string | number | null | undefined): string {
  if (value == null || value === "") return "—";
  return neutralizeFormula(String(value));
}

export async function buildXlsxBuffer(sheets: SheetTable[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Sadhox";
  wb.created = new Date();

  for (const sheet of sheets) {
    const ws = wb.addWorksheet(sheet.name.slice(0, 31), {
      views: [
        {
          state: "frozen",
          xSplit: sheet.freezeCols ?? 0,
          ySplit: 0, // set after header rows
        },
      ],
    });

    let rowIdx = 1;
    if (sheet.meta?.length) {
      for (const field of sheet.meta) {
        const row = ws.getRow(rowIdx++);
        row.getCell(1).value = field.label;
        row.getCell(1).font = { bold: true };
        row.getCell(2).value = field.value;
        if (rowIdx === 2) {
          row.getCell(2).font = { bold: true, size: 14 };
        }
      }
      rowIdx += 1; // blank
    }

    const hasGroups = sheet.columns.some((c) => c.group);
    const headerStart = rowIdx;

    if (hasGroups) {
      const groupRow = ws.getRow(rowIdx++);
      let col = 1;
      while (col <= sheet.columns.length) {
        const group = sheet.columns[col - 1]!.group ?? "";
        let end = col;
        while (
          end < sheet.columns.length &&
          (sheet.columns[end]!.group ?? "") === group
        ) {
          end += 1;
        }
        groupRow.getCell(col).value = group;
        groupRow.getCell(col).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE8EEF7" },
        };
        groupRow.getCell(col).font = { bold: true };
        if (end > col) {
          ws.mergeCells(headerStart, col, headerStart, end);
        }
        col = end + 1;
      }
    }

    const nameRow = ws.getRow(rowIdx++);
    sheet.columns.forEach((col, i) => {
      const cell = nameRow.getCell(i + 1);
      cell.value = col.header;
      cell.font = { bold: true };
      cell.border = { bottom: { style: "thin" } };
    });

    const dataStart = rowIdx;
    if (sheet.rows.length === 0) {
      const empty = ws.getRow(rowIdx++);
      empty.getCell(1).value = "No records in range";
    } else {
      for (const raw of sheet.rows) {
        const row = ws.getRow(rowIdx++);
        sheet.columns.forEach((col, i) => {
          const cell = row.getCell(i + 1);
          const value = raw[i];
          if (col.date) {
            const d = parseDate(
              value instanceof Date || typeof value === "string"
                ? value
                : value == null
                  ? null
                  : String(value),
            );
            if (d) {
              cell.value = d;
              cell.numFmt = DATE_FMT;
            } else {
              cell.value = "—";
            }
          } else if (col.currency) {
            const n =
              typeof value === "number"
                ? value
                : value == null || value === ""
                  ? null
                  : Number(value);
            if (n != null && Number.isFinite(n)) {
              cell.value = n;
              cell.numFmt = CURRENCY_FMT;
              cell.alignment = { horizontal: "right" };
            } else {
              cell.value = "—";
            }
          } else if (col.text) {
            cell.value = asText(value == null ? null : String(value));
          } else if (typeof value === "number") {
            cell.value = value;
          } else {
            const raw = value == null || value === "" ? "" : String(value);
            cell.value = raw === "" ? "—" : neutralizeFormula(raw);
          }
        });
        if ((rowIdx - dataStart) % 2 === 0) {
          row.eachCell((cell) => {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF7F9FC" },
            };
          });
        }
      }
    }

    const headerRows = (sheet.meta?.length ? sheet.meta.length + 1 : 0) + (hasGroups ? 2 : 1);
    ws.views = [
      {
        state: "frozen",
        xSplit: sheet.freezeCols ?? 0,
        ySplit: headerRows,
      },
    ];

    const lastCol = sheet.columns.length;
    const lastRow = Math.max(headerRows, rowIdx - 1);
    ws.autoFilter = {
      from: { row: headerRows, column: 1 },
      to: { row: lastRow, column: lastCol },
    };

    sheet.columns.forEach((col, i) => {
      const max = col.width ?? (col.header === "Description" ? 60 : col.header.includes("Title") ? 40 : 24);
      ws.getColumn(i + 1).width = Math.min(max, 60);
      if (col.header === "Description") {
        ws.getColumn(i + 1).alignment = { wrapText: true };
      }
    });
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
