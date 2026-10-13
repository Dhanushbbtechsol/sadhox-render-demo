function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function stamp(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}Z`;
}

function day(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function exportFilename(opts: {
  report: string;
  scope: string;
  from: Date;
  to: Date;
  ext: "csv" | "xlsx" | "zip";
  now?: Date;
}): string {
  const now = opts.now ?? new Date();
  return `${slug(opts.report)}_${slug(opts.scope)}_${day(opts.from)}_${day(opts.to)}_gen-${stamp(now)}.${opts.ext}`;
}
