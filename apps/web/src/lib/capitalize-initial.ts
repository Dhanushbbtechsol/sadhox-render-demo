/** Capitalize only the first character; leave the rest unchanged. */
export function capitalizeInitial(value: string): string {
  if (!value) return value;
  const first = value.charAt(0);
  const upper = first.toUpperCase();
  if (first === upper) return value;
  return upper + value.slice(1);
}

const SKIP_INPUT_TYPES = new Set([
  "email",
  "password",
  "number",
  "url",
  "tel",
  "hidden",
  "file",
  "date",
  "datetime-local",
  "time",
  "month",
  "week",
  "color",
  "range",
  "checkbox",
  "radio",
]);

export function shouldCapitalizeInputType(type: string | undefined): boolean {
  return !SKIP_INPUT_TYPES.has(type ?? "text");
}
