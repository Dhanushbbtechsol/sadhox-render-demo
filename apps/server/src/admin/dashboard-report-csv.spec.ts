import { describe, expect, it } from "vitest";
import {
  buildDashboardReportCsv,
  csvEscapeCell,
  dashboardReportFilename,
  neutralizeSpreadsheetFormula,
} from "./dashboard-report-csv";

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

  it("RFC 4180-quotes fields with commas and quotes", () => {
    expect(csvEscapeCell('a,b')).toBe('"a,b"');
    expect(csvEscapeCell('say "hi"')).toBe('"say ""hi"""');
  });

  it("builds Meta + KPI header sections and filename", () => {
    const csv = buildDashboardReportCsv({
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
      ],
      ticketsByStatus: [{ label: "New", count: 1 }],
      ticketsByPriority: [{ label: "P1", count: 1 }],
      ticketsByModule: [{ label: "Incident", count: 1 }],
      slaCompliance: {
        from: "a",
        to: "b",
        met: 1,
        breached: 0,
        rate: 100,
      },
      slaPerformance: [
        { weekStart: "2026-01-05", label: "Jan 5", met: 1, breached: 0 },
      ],
    });
    expect(csv).toContain("Meta");
    expect(csv).toContain("range,generatedAt,slaFrom,slaTo");
    expect(csv).toContain("KPIs");
    expect(csv).toContain("Tickets by status");
    expect(csv).toContain("SLA performance (weekly)");
    expect(dashboardReportFilename("7d", new Date("2026-10-08T12:00:00Z"))).toBe(
      "yukti-dashboard-7d-2026-10-08.csv",
    );
  });
});
