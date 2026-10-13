import { describe, expect, it } from "vitest";
import {
  buildCsvDocument,
  buildSummaryReportCsv,
  buildTicketReportCsv,
  csvEscapeCell,
  dashboardReportFilename,
  formatStatusLabel,
  formatUtcTimestamp,
  normalizeDescription,
  neutralizeSpreadsheetFormula,
  TICKET_HEADERS,
  type TicketReportRow,
} from "./dashboard-report-csv";

/** Minimal RFC 4180 parser for tests (no new dependency). */
function parseCsv(raw: string): string[][] {
  const text = raw.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (ch === "\n") {
      row.push(cell);
      if (!(row.length === 1 && row[0] === "" && i === text.length - 1)) {
        rows.push(row);
      }
      row = [];
      cell = "";
      continue;
    }
    cell += ch;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  // Drop trailing empty row from final newline
  if (rows.length > 0 && rows[rows.length - 1]!.length === 1 && rows[rows.length - 1]![0] === "") {
    rows.pop();
  }
  return rows;
}

describe("dashboard-report-csv", () => {
  it("neutralises spreadsheet formula prefixes on strings only", () => {
    expect(neutralizeSpreadsheetFormula("=1+1")).toBe("'=1+1");
    expect(neutralizeSpreadsheetFormula("+cmd")).toBe("'+cmd");
    expect(neutralizeSpreadsheetFormula("-1")).toBe("'-1");
    expect(neutralizeSpreadsheetFormula("@sum")).toBe("'@sum");
    expect(neutralizeSpreadsheetFormula("\tfoo")).toBe("'\tfoo");
    expect(neutralizeSpreadsheetFormula("\rfoo")).toBe("'\rfoo");
    expect(neutralizeSpreadsheetFormula("safe")).toBe("safe");
    expect(csvEscapeCell(42)).toBe("42");
    expect(csvEscapeCell(-7)).toBe("-7");
  });

  it("RFC 4180-quotes fields with commas, quotes, and newlines", () => {
    expect(csvEscapeCell("a,b")).toBe('"a,b"');
    expect(csvEscapeCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvEscapeCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it("builds UTF-8 BOM + CRLF document with equal column counts", () => {
    const csv = buildCsvDocument(["A", "B"], [["1", 2], ["x,y", "z"]]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.includes("\r\n")).toBe(true);
    expect(csv.includes("\n") && !csv.includes("\r\n")).toBe(false);
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.length === 2)).toBe(true);
    expect(rows[0]).toEqual(["A", "B"]);
    expect(rows[2]![0]).toBe("x,y");
  });

  it("formats status labels and UTC timestamps; nulls are empty", () => {
    expect(formatStatusLabel("InProgress")).toBe("In Progress");
    expect(formatStatusLabel("PendingApproval")).toBe("Pending Approval");
    expect(formatStatusLabel("InFulfillment")).toBe("In Fulfillment");
    expect(formatUtcTimestamp(null)).toBe("");
    expect(formatUtcTimestamp(undefined)).toBe("");
    expect(formatUtcTimestamp(new Date("2026-10-08T12:34:56.000Z"))).toBe(
      "2026-10-08 12:34:56",
    );
  });

  it("normalises description whitespace and caps at 1000 chars", () => {
    expect(normalizeDescription("a\nb\tc  d")).toBe("a b c d");
    expect(normalizeDescription(null)).toBe("");
    expect(normalizeDescription("x".repeat(1200)).length).toBe(1000);
  });

  it("summary report is one flat Section/Label/Value table", () => {
    const csv = buildSummaryReportCsv({
      range: "30d",
      generatedAt: "2026-10-08T00:00:00.000Z",
      kpis: [
        {
          id: "open",
          label: "Open tickets",
          value: "3",
          delta: "x",
          trend: "flat",
        },
        {
          id: "sla",
          label: "SLA compliance",
          value: "94%",
          delta: "x",
          trend: "up",
        },
      ],
      ticketsByStatus: [{ label: "New", count: 1 }],
      ticketsByPriority: [{ label: "P1", count: 1 }],
      ticketsByModule: [{ label: "Incident", count: 1 }],
      slaCompliance: {
        from: "2026-09-08T00:00:00.000Z",
        to: "2026-10-08T00:00:00.000Z",
        met: 1,
        breached: 0,
        rate: 100,
      },
      slaPerformance: [
        { weekStart: "2026-01-05", label: "Jan 5", met: 1, breached: 0 },
      ],
    });
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).not.toContain("\nMeta\n");
    const rows = parseCsv(csv);
    expect(rows[0]).toEqual(["Section", "Label", "Value"]);
    expect(rows.every((r) => r.length === 3)).toBe(true);
    expect(rows.some((r) => r[0] === "KPIs" && r[1] === "Open tickets")).toBe(
      true,
    );
  });

  it("ticket report uses Title Case headers, readable status, formula prefix on text", () => {
    const tickets: TicketReportRow[] = [
      {
        id: "11111111-1111-4111-8111-111111111111",
        referenceCode: "INC-000001",
        module: "Ticket",
        title: "=HACK()",
        status: "InProgress",
        priority: "P2",
        category: "Network",
        subcategory: "VPN",
        projectName: null,
        assignedTo: null,
        raisedBy: "Alice",
        approvedBy: null,
        createdAt: new Date("2026-10-08T10:00:00.000Z"),
        updatedAt: new Date("2026-10-08T11:00:00.000Z"),
        slaDueAt: null,
        slaBreached: false,
        resolvedAt: null,
        closedAt: null,
        approvedAt: null,
        description: "line1\nline2",
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        referenceCode: "REQ-000002",
        module: "Request",
        title: "Laptop",
        status: "InFulfillment",
        priority: "High",
        category: "IT",
        subcategory: null,
        projectName: "Ops",
        assignedTo: "Bob",
        raisedBy: "Carol",
        approvedBy: "Dana",
        createdAt: new Date("2026-10-09T10:00:00.000Z"),
        updatedAt: new Date("2026-10-09T11:00:00.000Z"),
        slaDueAt: null,
        slaBreached: null,
        resolvedAt: null,
        closedAt: null,
        approvedAt: new Date("2026-10-08T12:00:00.000Z"),
        description: null,
      },
    ];
    const csv = buildTicketReportCsv(tickets);
    const rows = parseCsv(csv);
    expect(rows[0]).toEqual([...TICKET_HEADERS]);
    expect(rows.every((r) => r.length === TICKET_HEADERS.length)).toBe(true);
    // Sorted: Incident before Service Request
    expect(rows[1]![0]).toBe("INC-000001");
    expect(rows[1]![1]).toBe("Incident");
    expect(rows[1]![2]).toBe("'=HACK()");
    expect(rows[1]![3]).toBe("In Progress");
    expect(rows[1]![17]).toBe("No"); // SLA Breached
    expect(rows[1]![18]).toBe("line1 line2"); // Description
    expect(rows[2]![0]).toBe("REQ-000002");
    expect(rows[2]![3]).toBe("In Fulfillment");
    expect(rows[2]![17]).toBe("");
  });

  it("filename includes type, range, and date", () => {
    expect(
      dashboardReportFilename("all", "7d", new Date("2026-10-08T12:00:00Z")),
    ).toBe("yukti-all-7d-2026-10-08.csv");
  });
});
