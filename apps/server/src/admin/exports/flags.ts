/**
 * Optional derived export features — default OFF (proposal hard constraint).
 */
export const EXPORT_FLAGS = {
  /** Total rows on desk breakdown / asset purchase cost. */
  derivedTotals: false,
  /** Person activity CSV: zip of section files vs single union file. */
  personCsvMode: "zip" as "zip" | "single",
  /** Overview sheet hyperlink index on person activity Excel. */
  personOverviewIndex: false,
};
