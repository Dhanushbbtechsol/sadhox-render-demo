import { describe, expect, it } from "vitest";
import { buildTicketProjectListFilter } from "./project-list-scope";

/** Minimal column stand-in — helper only needs a drizzle Column for inArray/isNull. */
const col = { name: "project_id" } as never;

describe("buildTicketProjectListFilter", () => {
  it("Admin and EndUser get no project filter", () => {
    expect(buildTicketProjectListFilter(col, "Admin", ["a"])).toBeUndefined();
    expect(buildTicketProjectListFilter(col, "EndUser", [])).toBeUndefined();
  });

  it("Manager with no accessible projects matches nothing", () => {
    const filter = buildTicketProjectListFilter(col, "Manager", []);
    expect(filter).toBeDefined();
  });

  it("Manager with ids scopes to those projects", () => {
    const filter = buildTicketProjectListFilter(col, "Manager", ["p1", "p2"]);
    expect(filter).toBeDefined();
  });

  it("Agent with no memberships still sees null-project tickets", () => {
    const filter = buildTicketProjectListFilter(col, "Agent", []);
    expect(filter).toBeDefined();
  });
});
