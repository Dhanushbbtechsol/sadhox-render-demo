/** Multiset equality of field maps (ignores column order). */
export function assertFieldMultisetEqual(
  a: Array<Record<string, string>>,
  b: Array<Record<string, string>>,
): void {
  if (a.length !== b.length) {
    throw new Error(`Record count mismatch: ${a.length} vs ${b.length}`);
  }
  const normalize = (rows: Array<Record<string, string>>) =>
    [...rows]
      .map((r) =>
        Object.keys(r)
          .sort()
          .map((k) => `${k}=${r[k] ?? ""}`)
          .join("|"),
      )
      .sort();
  const left = normalize(a);
  const right = normalize(b);
  for (let i = 0; i < left.length; i++) {
    if (left[i] !== right[i]) {
      throw new Error(`Parity mismatch at ${i}:\n${left[i]}\nvs\n${right[i]}`);
    }
  }
}
