import { describe, expect, it } from "vitest";
import type { DeskReport } from "../desk-report";
import { buildDeskExportCsv } from "./desk";

describe("buildDeskExportCsv", () => {
  it("emits long-format Section,Label,Value without meta header lines", () => {
    const report: DeskReport = {
      title: "Desk report",
      generatedAt: "2026-10-09T00:00:00.000Z",
      range: "30d",
      scope: "All",
      kpis: {
        incidentsOpen: 1,
        incidentsResolved: 2,
        serviceRequestsOpen: 0,
        serviceRequestsApproved: 1,
      },
      byStatus: [{ status: "New", count: 1 }],
      byPriority: [{ priority: "P1", count: 1 }],
      byCategory: [{ category: "Network", count: 1 }],
      sla: { met: 9, breached: 1, rate: 90 },
    };
    const csv = buildDeskExportCsv(report);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Section,Label,Value");
    expect(csv).toContain("KPI,Incidents open,1");
    expect(csv).toContain("SLA,Rate,0.9");
    expect(csv).not.toContain("Title,Desk report");
  });
});
