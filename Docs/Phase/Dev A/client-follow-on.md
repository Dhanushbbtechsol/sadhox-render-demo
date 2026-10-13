# Dev A — client follow-on

**Design:** [../client-follow-on.md](../client-follow-on.md)  
**Wait for** U2 and U4.

- U5. Ticket and issue screens. R1, R2, R8.

Everyday labels for every role, including admin and manager copy. Hide the assign control for Agent and Manager on a project ticket. The assignee name stays visible.

**2026-10-13:** Ticket create loads Admin taxonomy (`category-taxonomy`); priority preview includes subcategory min floor. Runtime validation is DB-backed (`IncidentCategoriesService`), not the Phase 7 static map alone.
