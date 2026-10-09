import { describe, expect, it } from "vitest";
import { deskReportToCsv, type DeskReport } from "./desk-report";

describe("deskReportToCsv", () => {
  it("includes title and Scope,Team", () => {
    const report: DeskReport = {
      title: "Desk report",
      generatedAt: "2026-10-09T00:00:00.000Z",
      range: "7d",
      scope: "Team",
      kpis: {
        incidentsOpen: 1,
        incidentsResolved: 2,
        serviceRequestsOpen: 0,
        serviceRequestsApproved: 1,
      },
      byStatus: [{ status: "New", count: 1 }],
      byPriority: [{ priority: "P1", count: 1 }],
      byCategory: [{ category: "Network", count: 1 }],
      sla: { met: 1, breached: 0, rate: 100 },
    };
    const csv = deskReportToCsv(report);
    expect(csv).toContain("Title,Desk report");
    expect(csv).toContain("Scope,Team");
  });
});
