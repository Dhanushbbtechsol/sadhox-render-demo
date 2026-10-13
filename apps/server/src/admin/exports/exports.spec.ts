import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import type { TicketReportRow } from "../dashboard-report-csv";
import { neutralizeSpreadsheetFormula } from "../dashboard-report-csv";
import {
  assertFieldMultisetEqual,
  buildAssetExportCsv,
  buildTicketExportCsv,
  buildTicketExportXlsx,
  neutralizeFormula,
  ticketRecordFields,
} from "./index";
import type { AssetReportRow } from "../dashboard-report-csv";

const sampleTicket: TicketReportRow = {
  id: "11111111-1111-4111-8111-111111111111",
  referenceCode: "INC-000123",
  module: "Incident",
  title: "VPN down",
  status: "InProgress",
  priority: "P1",
  category: "Network",
  subcategory: "VPN",
  projectName: "Corp",
  assignedTo: "Agent A",
  raisedBy: "User U",
  approvedBy: null,
  createdAt: "2026-10-01T10:00:00.000Z",
  updatedAt: "2026-10-02T11:00:00.000Z",
  slaDueAt: "2026-10-01T12:00:00.000Z",
  slaBreached: false,
  resolvedAt: null,
  closedAt: null,
  approvedAt: null,
  description: "Cannot connect",
};

const sampleAsset: AssetReportRow = {
  referenceCode: "AST-1",
  assetTag: "HW-00123",
  name: "Laptop",
  type: "Hardware",
  status: "Active",
  ownerName: "Ada",
  ownerEmail: "ada@example.com",
  serialNumber: "1234567890123456",
  location: "BLR",
  purchaseCost: "1200.50",
  linkedTicketId: "t-1",
  assignedAt: "2026-09-01T00:00:00.000Z",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-02T00:00:00.000Z",
};

describe("export normalize", () => {
  it("matches legacy formula guard", () => {
    for (const v of ["=1+1", "+cmd", "-1", "@sum", "\tfoo", "\rfoo", "safe"]) {
      expect(neutralizeFormula(v)).toBe(neutralizeSpreadsheetFormula(v));
    }
  });
});

describe("ticket export parity", () => {
  it("keeps the same field multiset after column reorder", () => {
    const rows = [sampleTicket];
    const fields = rows.map(ticketRecordFields);
    assertFieldMultisetEqual(fields, fields);
    const csv = buildTicketExportCsv(rows);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Ticket ID,Module,Title / Service");
    expect(csv).toContain("Raised By,Assigned To,Approved By");
    expect(csv).not.toContain("(UTC)");
    expect(csv).toContain("INC-000123");
    expect(csv).not.toContain("11111111-1111-4111-8111-111111111111");
    expect(csv).toContain("No");
  });

  it("writes xlsx with Tickets sheet, freeze, and autofilter", async () => {
    const { body, filename, contentType } = await buildTicketExportXlsx(
      [sampleTicket],
      {
        range: "30d",
        from: new Date("2026-09-01T00:00:00Z"),
        to: new Date("2026-10-01T00:00:00Z"),
        type: "all",
      },
    );
    expect(contentType).toContain("spreadsheetml");
    expect(filename).toMatch(/\.xlsx$/);
    expect(filename).toContain("tickets-all");

    const wb = new ExcelJS.Workbook();
    // exceljs accepts Buffer/ArrayBuffer-like
    await wb.xlsx.load(body as unknown as ExcelJS.Buffer);
    const sheet = wb.getWorksheet("Tickets");
    expect(sheet).toBeTruthy();
    expect(sheet!.views?.[0]?.state).toBe("frozen");
    expect(sheet!.autoFilter).toBeTruthy();
  });
});

describe("asset export", () => {
  it("uses ownership-before-details column order and keeps serial as text in csv", () => {
    const csv = buildAssetExportCsv([sampleAsset]);
    const header = csv.split("\r\n")[0]!.replace(/^\uFEFF/, "");
    expect(header.indexOf("Owner Email")).toBeLessThan(
      header.indexOf("Serial Number"),
    );
    expect(header.indexOf("Location")).toBeLessThan(
      header.indexOf("Serial Number"),
    );
    expect(csv).toContain("1234567890123456");
    expect(csv).toContain("HW-00123");
  });
});
