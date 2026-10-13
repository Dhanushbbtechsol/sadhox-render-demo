/** Escape `%`, `_`, and `\` so user search text is a literal ILIKE substring. */
export function likeContains(raw: string): string {
  const literal = raw.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  return `%${literal}%`;
}
