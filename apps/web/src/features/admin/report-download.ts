import { downloadBlob } from "./export-dashboard-csv";

export type ReportDownloadFormat = "csv" | "excel";

export const REPORT_DOWNLOAD_FORMATS: {
  value: ReportDownloadFormat;
  label: string;
}[] = [
  { value: "csv", label: "CSV" },
  { value: "excel", label: "Excel" },
];

/** Default person CSV layout: zip of section files (proposal flag). */
export const PERSON_CSV_MODE: "zip" | "single" = "zip";

function csvEscape(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function neutralize(value: string): string {
  if (!value) return value;
  const first = value[0]!;
  if ("=+-@\t\r".includes(first)) return `'${value}`;
  return value;
}

function buildCsvTable(headers: string[], rows: string[][]): string {
  const lines = [
    headers.map((h) => csvEscape(neutralize(h))).join(","),
    ...rows.map((row) =>
      row.map((cell) => csvEscape(neutralize(String(cell ?? "")))).join(","),
    ),
  ];
  if (rows.length === 0) {
    lines.push(csvEscape("None in this range."));
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

function xmlEscape(value: string) {
  return neutralize(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** 1-based column index → A, B, … AA. */
function colName(index1: number): string {
  let n = index1;
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function sheetDataXml(rows: string[][]): string {
  const body = rows
    .map((row, ri) => {
      const r = ri + 1;
      const cells = row
        .map((val, ci) => {
          const ref = `${colName(ci + 1)}${r}`;
          return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(String(val ?? ""))}</t></is></c>`;
        })
        .join("");
      return `<row r="${r}">${cells}</row>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`;
}

function tableRows(headers: string[], rows: string[][]): string[][] {
  if (rows.length === 0) return [headers, ["None in this range."]];
  return [headers, ...rows];
}

/** Real .xlsx (OOXML zip) — no exceljs on the web bundle. */
function buildXlsxBlob(sheets: { name: string; rows: string[][] }[]): Blob {
  const names = sheets.map((s, i) => {
    const base = s.name.replace(/[/\\*?:[\]]/g, " ").trim().slice(0, 31);
    return base || `Sheet${i + 1}`;
  });
  const files: { name: string; content: string }[] = [
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
${names
  .map(
    (_, i) =>
      `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
  )
  .join("")}
</Types>`,
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>
${names
  .map(
    (n, i) =>
      `<sheet name="${xmlEscape(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`,
  )
  .join("")}
</sheets>
</workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${names
  .map(
    (_, i) =>
      `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
  )
  .join("")}
</Relationships>`,
    },
    ...sheets.map((s, i) => ({
      name: `xl/worksheets/sheet${i + 1}.xml`,
      content: sheetDataXml(s.rows),
    })),
  ];
  return new Blob([buildZip(files)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/** CRC32 for zip local headers. */
function crc32(buf: Uint8Array): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]!;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
    }
  }
  return ~c >>> 0;
}

function u16(n: number): Uint8Array {
  const b = new Uint8Array(2);
  new DataView(b.buffer).setUint16(0, n, true);
  return b;
}
function u32(n: number): Uint8Array {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n, true);
  return b;
}

/** Store-only ZIP (no compression) — no dependency. */
export function buildZip(files: { name: string; content: string }[]): Blob {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const data = encoder.encode(file.content);
    const crc = crc32(data);
    const local = new Uint8Array([
      ...u32(0x04034b50),
      ...u16(20),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u32(crc),
      ...u32(data.length),
      ...u32(data.length),
      ...u16(nameBytes.length),
      ...u16(0),
      ...nameBytes,
      ...data,
    ]);
    parts.push(local);
    const cen = new Uint8Array([
      ...u32(0x02014b50),
      ...u16(20),
      ...u16(20),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u32(crc),
      ...u32(data.length),
      ...u32(data.length),
      ...u16(nameBytes.length),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u32(0),
      ...u32(offset),
      ...nameBytes,
    ]);
    central.push(cen);
    offset += local.length;
  }

  const centralSize = central.reduce((s, p) => s + p.length, 0);
  const end = new Uint8Array([
    ...u32(0x06054b50),
    ...u16(0),
    ...u16(0),
    ...u16(files.length),
    ...u16(files.length),
    ...u32(centralSize),
    ...u32(offset),
    ...u16(0),
  ]);

  return new Blob([...parts, ...central, end] as BlobPart[], {
    type: "application/zip",
  });
}

/** Column defs shared by Run report UI and Excel/CSV download. */
export const PERSON_TICKET_COLUMNS = [
  { key: "referenceCode", label: "Ref" },
  { key: "title", label: "Title" },
  { key: "status", label: "Status" },
  { key: "priority", label: "Priority" },
  { key: "category", label: "Category" },
  { key: "subcategory", label: "Subcategory" },
  { key: "impact", label: "Impact" },
  { key: "urgency", label: "Urgency" },
  { key: "slaBreached", label: "SLA Breached" },
  { key: "createdAt", label: "Created" },
  { key: "updatedAt", label: "Updated" },
  { key: "resolvedAt", label: "Resolved" },
] as const;

export const PERSON_REQUEST_COLUMNS = [
  { key: "referenceCode", label: "Ref" },
  { key: "title", label: "Title" },
  { key: "status", label: "Status" },
  { key: "urgency", label: "Urgency" },
  { key: "createdAt", label: "Created" },
  { key: "updatedAt", label: "Updated" },
  { key: "approvedAt", label: "Approved" },
  { key: "fulfilledAt", label: "Fulfilled" },
] as const;

export const PERSON_CHANGE_COLUMNS = [
  { key: "referenceCode", label: "Ref" },
  { key: "title", label: "Title" },
  { key: "type", label: "Type" },
  { key: "status", label: "Status" },
  { key: "scheduledStart", label: "Scheduled Start" },
  { key: "scheduledEnd", label: "Scheduled End" },
  { key: "createdAt", label: "Created" },
  { key: "updatedAt", label: "Updated" },
  { key: "approvedAt", label: "Approved" },
] as const;

export const PERSON_ASSET_COLUMNS = [
  { key: "referenceCode", label: "Ref" },
  { key: "assetTag", label: "Tag" },
  { key: "name", label: "Name" },
  { key: "type", label: "Type" },
  { key: "status", label: "Status" },
  { key: "location", label: "Location" },
  { key: "serialNumber", label: "Serial" },
  { key: "purchaseCost", label: "Purchase Cost" },
  { key: "assignedAt", label: "Assigned" },
] as const;

export const PERSON_AUDIT_COLUMNS = [
  { key: "createdAt", label: "When" },
  { key: "action", label: "Action" },
  { key: "entityType", label: "Entity" },
  { key: "referenceCode", label: "Reference ID" },
] as const;

export type PersonActivityExport = {
  user: {
    name: string;
    email: string;
    role: string;
    referenceCode?: string;
    reportsToName?: string | null;
    reportsToEmail?: string | null;
    createdAt?: string;
  };
  range: string;
  from: string;
  to: string;
  ticketsReported: Array<Record<string, string>>;
  requests: Array<Record<string, string>>;
  changes: Array<Record<string, string>>;
  logs: Array<Record<string, string>>;
  assets: Array<Record<string, string>>;
  counts?: {
    ticketsReported: number;
    requests: number;
    changes: number;
    logs: number;
    assets: number;
  };
};

function cell(value: string | boolean | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function mapRows(
  rows: Array<Record<string, string>>,
  columns: ReadonlyArray<{ key: string; label: string }>,
): { headers: string[]; rows: string[][] } {
  return {
    headers: columns.map((c) => c.label),
    rows: rows.map((r) => columns.map((c) => cell(r[c.key]))),
  };
}

function personSections(report: PersonActivityExport) {
  return {
    reported: mapRows(report.ticketsReported, PERSON_TICKET_COLUMNS),
    requests: mapRows(report.requests, PERSON_REQUEST_COLUMNS),
    changes: mapRows(report.changes, PERSON_CHANGE_COLUMNS),
    assets: mapRows(report.assets, PERSON_ASSET_COLUMNS),
    audit: mapRows(
      [...report.logs].sort((a, b) =>
        (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
      ),
      PERSON_AUDIT_COLUMNS,
    ),
  };
}

function personSheetRows(
  report: PersonActivityExport,
  counts: NonNullable<PersonActivityExport["counts"]>,
): string[][] {
  return [
    ["Field", "Value"],
    ["Name", report.user.name],
    ["User Ref", report.user.referenceCode ?? "—"],
    ["Email", report.user.email],
    ["Role", report.user.role],
    ["Reports To", report.user.reportsToName ?? "—"],
    ["Reports To Email", report.user.reportsToEmail ?? "—"],
    ["User Created", report.user.createdAt ?? "—"],
    ["Range", report.range],
    ["From", report.from],
    ["To", report.to],
    ["Generated", new Date().toISOString()],
    ["Timezone", "UTC"],
    [],
    ["Section", "Rows"],
    ["Tickets reported", String(counts.ticketsReported)],
    ["Requests", String(counts.requests)],
    ["Change requests", String(counts.changes)],
    ["Assets held (current)", String(counts.assets)],
    ["Audit log", String(counts.logs)],
    [],
    [
      "Note",
      "Open each sheet for the full table. Activity sheets use the date range; Assets are current holdings.",
    ],
  ];
}

export function downloadPersonActivityReport(
  report: PersonActivityExport,
  format: ReportDownloadFormat,
) {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const safe = report.user.name.replace(/[^\w.-]+/g, "_").slice(0, 40);
  const sections = personSections(report);
  const counts = report.counts ?? {
    ticketsReported: report.ticketsReported.length,
    requests: report.requests.length,
    changes: report.changes.length,
    logs: report.logs.length,
    assets: report.assets.length,
  };

  const dataSheets = [
    { name: "Tickets reported", section: sections.reported },
    { name: "Requests", section: sections.requests },
    { name: "Change requests", section: sections.changes },
    { name: "Assets held", section: sections.assets },
    { name: "Audit log", section: sections.audit },
  ] as const;

  if (format === "csv") {
    if (PERSON_CSV_MODE === "single") {
      const headers = ["Section", ...PERSON_TICKET_COLUMNS.map((c) => c.label)];
      const rows: string[][] = [];
      for (const sheet of dataSheets) {
        for (const row of sheet.section.rows) {
          const padded = [...row];
          while (padded.length < PERSON_TICKET_COLUMNS.length) padded.push("");
          rows.push([sheet.name, ...padded.slice(0, PERSON_TICKET_COLUMNS.length)]);
        }
      }
      downloadBlob(
        `person-activity_${safe}_${stamp}.csv`,
        new Blob([buildCsvTable(headers, rows)], {
          type: "text/csv;charset=utf-8",
        }),
      );
      return;
    }

    const personCsv = personSheetRows(report, counts)
      .map((row) => row.map((c) => csvEscape(neutralize(String(c ?? "")))).join(","))
      .join("\r\n");
    downloadBlob(
      `person-activity_${safe}_${stamp}.zip`,
      buildZip([
        { name: "person.csv", content: `\uFEFF${personCsv}\r\n` },
        ...dataSheets.map((sheet) => ({
          name: `${sheet.name.toLowerCase().replaceAll(" ", "-")}.csv`,
          content: buildCsvTable(sheet.section.headers, sheet.section.rows),
        })),
      ]),
    );
    return;
  }

  downloadBlob(
    `person-activity_${safe}_${stamp}.xlsx`,
    buildXlsxBlob([
      { name: "Person", rows: personSheetRows(report, counts) },
      ...dataSheets.map((sheet) => ({
        name: sheet.name,
        rows: tableRows(sheet.section.headers, sheet.section.rows),
      })),
    ]),
  );
}

/** @deprecated Prefer downloadPersonActivityReport */
export function downloadReportDocument(opts: {
  baseName: string;
  format: ReportDownloadFormat;
  metaLines: string[];
  sections: { title: string; headers: string[]; rows: string[][] }[];
}) {
  const stamp = new Date().toISOString().slice(0, 10);
  const base = `${opts.baseName}-${stamp}`;
  if (opts.format === "csv") {
    const parts = [...opts.metaLines, ""];
    for (const section of opts.sections) {
      parts.push(csvEscape(section.title));
      parts.push(section.headers.map(csvEscape).join(","));
      for (const row of section.rows) {
        parts.push(row.map((c) => csvEscape(String(c ?? ""))).join(","));
      }
      parts.push("");
    }
    downloadBlob(
      `${base}.csv`,
      new Blob([parts.join("\n")], { type: "text/csv;charset=utf-8" }),
    );
    return;
  }
  downloadPersonActivityReport(
    {
      user: { name: opts.baseName, email: "", role: "" },
      range: "",
      from: "",
      to: "",
      ticketsReported: [],
      requests: [],
      changes: [],
      logs: [],
      assets: [],
    },
    "excel",
  );
}
