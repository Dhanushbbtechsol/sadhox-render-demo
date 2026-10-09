/** True when the asset owner id changes (assign, reassign, or unassign). */
export function assignmentChanged(
  previous: string | null | undefined,
  next: string | null | undefined,
): boolean {
  return (previous ?? null) !== (next ?? null);
}
