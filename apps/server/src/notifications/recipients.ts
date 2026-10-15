export type NotificationEvent =
  | { type: "sr.submitted"; managerId: string | null; adminIds: string[] }
  | {
      type: "comment.created";
      reporterId: string;
      assigneeId: string | null;
      authorId: string;
    }
  | {
      type: "incident.assigned";
      assigneeId: string;
      reporterId: string;
    }
  | { type: "incident.resolved"; reporterId: string }
  | { type: "incident.closed"; reporterId: string }
  | { type: "incident.p1_created"; adminIds: string[] };

/** Phase 9 — in-app / mail recipient user ids for a domain event. */
export function recipientIds(event: NotificationEvent): string[] {
  switch (event.type) {
    case "sr.submitted": {
      // Manager (if any) and Admins both get the review queue.
      const ids = [...event.adminIds];
      if (event.managerId) ids.unshift(event.managerId);
      return [...new Set(ids)];
    }
    case "comment.created": {
      const ids = new Set<string>();
      ids.add(event.reporterId);
      if (event.assigneeId) ids.add(event.assigneeId);
      ids.delete(event.authorId);
      return [...ids];
    }
    case "incident.assigned":
      return [...new Set([event.assigneeId, event.reporterId])];
    case "incident.resolved":
    case "incident.closed":
      return [event.reporterId];
    case "incident.p1_created":
      return [...event.adminIds];
    default:
      return [];
  }
}
