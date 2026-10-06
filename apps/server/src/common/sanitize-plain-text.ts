/**
 * Normalize free-text comments to plain text so HTML/script payloads cannot
 * be stored for later HTML rendering (email templates, future rich UI).
 * React text nodes already escape on display; this is defense-in-depth.
 */
export function sanitizePlainText(input: string, maxLength = 4000): string {
  let value = input.normalize("NFKC");
  // Strip HTML-like tags (script/img/div/…) before removing leftover brackets.
  value = value.replace(/<\/?[a-zA-Z!?][^>]*>/g, " ");
  // Neutralize leftover angle brackets so stored text stays non-HTML.
  value = value.replace(/[<>]/g, "");
  // Drop C0/C1 control chars except tab/newline/carriage-return.
  // eslint-disable-next-line no-control-regex -- intentional control-char strip
  value = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "");
  value = value.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
  // Collapse runs of spaces left by tag stripping (preserve newlines).
  value = value.replace(/[^\S\n]{2,}/g, " ");
  value = value.trim();
  if (value.length > maxLength) {
    value = value.slice(0, maxLength).trimEnd();
  }
  return value;
}

/** Strip CR/LF and other controls from values interpolated into email subjects. */
export function sanitizeEmailSubjectPart(input: string, maxLength = 200): string {
  let value = input.normalize("NFKC");
  // eslint-disable-next-line no-control-regex -- intentional control-char strip
  value = value.replace(/[\r\n\u0000-\u001F\u007F-\u009F]/g, " ");
  value = value.replace(/\s+/g, " ").trim();
  if (value.length > maxLength) {
    value = value.slice(0, maxLength).trimEnd();
  }
  return value;
}
