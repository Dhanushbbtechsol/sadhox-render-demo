import type { AssetReportRow } from "../dashboard-report-csv";
import { buildCsvDocument } from "./csv";
import { exportFilename } from "./filename";
import { formatCsvDateUtcFull } from "./normalize";
import { buildXlsxBuffer, XLSX_CONTENT_TYPE, type ColumnDef } from "./xlsx";

export const ASSET_EXPORT_COLUMNS: ColumnDef[] = [
  { header: "Ref", group: "Asset", text: true, width: 14 },
  { header: "Asset Tag", group: "Asset", text: true, width: 16 },
  { header: "Name", group: "Asset", width: 28 },
  { header: "Type", group: "Asset", width: 12 },
  { header: "Status", group: "Asset", width: 12 },
  { header: "Owner", group: "Ownership", width: 20 },
  { header: "Owner Email", group: "Ownership", width: 28 },
  { header: "Location", group: "Ownership", width: 18 },
  { header: "Serial Number", group: "Details", text: true, width: 18 },
  { header: "Purchase Cost", group: "Details", currency: true, width: 14 },
  { header: "Linked Ticket", group: "Details", text: true, width: 20 },
  { header: "Assigned", group: "Dates", date: true, width: 18 },
  { header: "Created", group: "Dates", date: true, width: 18 },
  { header: "Updated", group: "Dates", date: true, width: 18 },
];

function sortAssets(rows: AssetReportRow[]): AssetReportRow[] {
  return [...rows].sort((a, b) => {
    const t = a.type.localeCompare(b.type);
    if (t !== 0) return t;
    return a.assetTag.localeCompare(b.assetTag);
  });
}

function assetCsvCells(row: AssetReportRow): Array<string | number> {
  return [
    row.referenceCode,
    row.assetTag,
    row.name,
    row.type,
    row.status,
    row.ownerName ?? "",
    row.ownerEmail ?? "",
    row.location ?? "",
    row.serialNumber ?? "",
    row.purchaseCost ?? "",
    row.linkedTicketId ?? "",
    formatCsvDateUtcFull(row.assignedAt),
    formatCsvDateUtcFull(row.createdAt),
    formatCsvDateUtcFull(row.updatedAt),
  ];
}

function assetXlsxCells(
  row: AssetReportRow,
): Array<string | number | Date | null> {
  return [
    row.referenceCode,
    row.assetTag,
    row.name,
    row.type,
    row.status,
    row.ownerName ?? "",
    row.ownerEmail ?? "",
    row.location ?? "",
    row.serialNumber ?? "",
    row.purchaseCost ?? "",
    row.linkedTicketId ?? "",
    row.assignedAt,
    row.createdAt,
    row.updatedAt,
  ];
}

export function buildAssetExportCsv(rows: AssetReportRow[]): string {
  return buildCsvDocument(
    ASSET_EXPORT_COLUMNS.map((c) => c.header),
    sortAssets(rows).map(assetCsvCells),
  );
}

export async function buildAssetExportXlsx(
  rows: AssetReportRow[],
  meta: { range: string; from: Date; to: Date; generatedAt?: Date },
): Promise<{ body: Buffer; filename: string; contentType: string }> {
  const generatedAt = meta.generatedAt ?? new Date();
  const body = await buildXlsxBuffer([
    {
      name: "Assets",
      meta: [
        { label: "Title", value: "Assets report" },
        { label: "Scope", value: "assets" },
        { label: "Range", value: meta.range },
        { label: "Generated", value: generatedAt.toISOString() },
        { label: "Timezone", value: "UTC" },
      ],
      columns: ASSET_EXPORT_COLUMNS,
      rows: sortAssets(rows).map(assetXlsxCells),
      freezeCols: 2,
    },
  ]);
  return {
    body,
    filename: exportFilename({
      report: "assets",
      scope: "all",
      from: meta.from,
      to: meta.to,
      ext: "xlsx",
      now: generatedAt,
    }),
    contentType: XLSX_CONTENT_TYPE,
  };
}

export function assetRecordFields(row: AssetReportRow): Record<string, string> {
  return {
    ref: row.referenceCode,
    assetTag: row.assetTag,
    name: row.name,
    type: row.type,
    status: row.status,
    owner: row.ownerName ?? "",
    ownerEmail: row.ownerEmail ?? "",
    location: row.location ?? "",
    serialNumber: row.serialNumber ?? "",
    purchaseCost: row.purchaseCost ?? "",
    linkedTicket: row.linkedTicketId ?? "",
    assigned: formatCsvDateUtcFull(row.assignedAt),
    created: formatCsvDateUtcFull(row.createdAt),
    updated: formatCsvDateUtcFull(row.updatedAt),
  };
}
