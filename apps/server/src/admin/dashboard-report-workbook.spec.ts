import { describe, expect, it } from "vitest";
import {
  buildSummaryWorkbookXml,
  buildTidyFigureRows,
  buildWorkGroupRows,
  WORK_GROUPS_NOTE,
  type SummaryWorkbookData,
} from "./dashboard-report-workbook";
import type { TicketReportRow } from "./dashboard-report-csv";

function sampleTickets(): TicketReportRow[] {
  return [
    {
      id: "11111111-1111-4111-8111-111111111111",
      referenceCode: "INC-000001",
      module: "Ticket",
      title: "A",
      status: "Assigned",
      priority: "P2",
      category: "Network",
      subcategory: "VPN",
      projectName: null,
      assignedTo: "Bob",
      raisedBy: "Alice",
      approvedBy: null,
      createdAt: new Date("2026-10-08T10:00:00Z"),
      updatedAt: new Date("2026-10-08T11:00:00Z"),
      slaDueAt: null,
      slaBreached: false,
      resolvedAt: null,
      closedAt: null,
      approvedAt: null,
      description: "d",
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      referenceCode: "INC-000002",
      module: "Ticket",
      title: "B",
      status: "InProgress",
      priority: "P1",
      category: "Network",
      subcategory: "VPN",
      projectName: null,
      assignedTo: null,
      raisedBy: "Alice",
      approvedBy: null,
      createdAt: new Date("2026-10-07T10:00:00Z"),
      updatedAt: new Date("2026-10-07T11:00:00Z"),
      slaDueAt: null,
      slaBreached: null,
      resolvedAt: null,
      closedAt: null,
      approvedAt: null,
      description: null,
    },
    {
      id: "33333333-3333-4333-8333-333333333333",
      referenceCode: "REQ-000003",
      module: "Request",
      title: "Laptop",
      status: "Approved",
      priority: "High",
      category: "IT",
      subcategory: null,
      projectName: "Ops",
      assignedTo: null,
      raisedBy: "Carol",
      approvedBy: "Dana",
      createdAt: new Date("2026-10-06T10:00:00Z"),
      updatedAt: new Date("2026-10-06T11:00:00Z"),
      slaDueAt: null,
      slaBreached: null,
      resolvedAt: null,
      closedAt: null,
      approvedAt: new Date("2026-10-06T12:00:00Z"),
      description: null,
    },
  ];
}

function sampleData(tickets: TicketReportRow[]): SummaryWorkbookData {
  const from = new Date("2026-09-09T00:00:00Z");
  const to = new Date("2026-10-09T00:00:00Z");
  return {
    period: {
      range: "30d",
      from,
      to,
      generatedAt: to,
    },
    overview: [
      {
        metric: "Total tickets (range)",
        value: tickets.length,
        unit: "count",
        definition: "reconciles",
      },
    ],
    byModule: [
      { module: "Ticket", open: 2, closed: 0, total: 2 },
      { module: "Request", open: 1, closed: 0, total: 1 },
      { module: "Change request", open: 0, closed: 0, total: 0 },
    ],
    byStatus: [
      { module: "Ticket", status: "Assigned", count: 1 },
      { module: "Ticket", status: "InProgress", count: 1 },
      { module: "Request", status: "Approved", count: 1 },
    ],
    workGroups: buildWorkGroupRows(tickets),
    workGroupsNote: WORK_GROUPS_NOTE,
    byPriority: [{ priority: "P1", count: 1 }, { priority: "P2", count: 1 }],
    slaCompliance: { met: 1, breached: 0, rate: 100 },
    slaWeeks: [{ weekStart: "2026-10-06", label: "Oct 6", met: 1, breached: 0 }],
    tickets,
  };
}

describe("dashboard-report-workbook", () => {
  it("work groups follow REPORT_STATUS_FILTER counts", () => {
    const groups = buildWorkGroupRows(sampleTickets());
    expect(groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          group: "Assigned",
          module: "Ticket",
          tickets: 1,
        }),
        expect.objectContaining({
          group: "In Progress",
          module: "Ticket",
          tickets: 1,
        }),
        expect.objectContaining({
          group: "Approved",
          module: "Request",
          tickets: 1,
        }),
      ]),
    );
  });

  it("builds SpreadsheetML with all sheets, freeze, and formula-safe text", () => {
    const tickets = sampleTickets();
    tickets[0]!.title = "=HACK()";
    const xml = buildSummaryWorkbookXml(sampleData(tickets));
    expect(xml).toContain('ss:Name="Overview"');
    expect(xml).toContain('ss:Name="By Module"');
    expect(xml).toContain('ss:Name="By Status"');
    expect(xml).toContain('ss:Name="Work Groups"');
    expect(xml).toContain('ss:Name="By Priority"');
    expect(xml).toContain('ss:Name="SLA"');
    expect(xml).toContain('ss:Name="Tickets"');
    expect(xml).toContain("FreezePanes");
    expect(xml).toContain("AutoFilter");
    expect(xml).toContain("Contains staff and requester names");
    expect(xml).toContain(WORK_GROUPS_NOTE);
    expect(xml).toContain("'=HACK()");
    expect(xml).toContain("In Progress");
    expect(xml).not.toMatch(/@.*\.local/);
  });

  it("tidy figures exclude tickets and cover overview/module/status/group/priority/sla", () => {
    const rows = buildTidyFigureRows(sampleData(sampleTickets()));
    expect(rows.every((r) => r.section !== "Tickets")).toBe(true);
    expect(rows.some((r) => r.section === "Overview")).toBe(true);
    expect(rows.some((r) => r.section === "By Module")).toBe(true);
    expect(rows.some((r) => r.section === "By Status")).toBe(true);
    expect(rows.some((r) => r.section === "Work Groups")).toBe(true);
    expect(rows.some((r) => r.section === "By Priority")).toBe(true);
    expect(rows.some((r) => r.section === "SLA")).toBe(true);
  });

  it("reconciles tickets to by-module totals and work-group counts", () => {
    const tickets = sampleTickets();
    const data = sampleData(tickets);
    const moduleTotal = data.byModule.reduce((s, m) => s + m.total, 0);
    expect(tickets.length).toBe(moduleTotal);
    expect(data.overview[0]?.value).toBe(tickets.length);
    const assigned = data.workGroups.find(
      (g) => g.group === "Assigned" && g.module === "Ticket",
    );
    expect(assigned?.tickets).toBe(
      tickets.filter((t) => t.module === "Ticket" && t.status === "Assigned")
        .length,
    );
    for (const m of data.byModule) {
      expect(m.open + m.closed).toBe(m.total);
    }
  });
});
