import { describe, expect, it, vi } from "vitest";
import { ProjectsService } from "./projects.service";

/**
 * U8 — the combined project summary/edit replaces the separate Edit /
 * Members / Modules dialogs. Requirement (verbatim): "One save updates the
 * name, the manager, the members, and the modules." This spec exercises
 * `ProjectsService.saveSummary` — the one save path — and fails if any of
 * the four is not persisted by that single call.
 */

type Row = Record<string, unknown>;

/** Drizzle-style lazy query builder: any chain method returns itself; awaiting
 * it resolves to the next canned row set. Matches this codebase's existing
 * db-mock convention (see admin.user-role.spec.ts) generalized to chains
 * that mix `.leftJoin`/`.innerJoin`/`.limit`. */
function makeSelectChain(rows: Row[]) {
  const chain: Record<string, unknown> = {
    from: () => chain,
    leftJoin: () => chain,
    innerJoin: () => chain,
    where: () => chain,
    limit: () => chain,
    then: (resolve: (value: Row[]) => void) => resolve(rows),
  };
  return chain;
}

function makeTx(selectQueue: Row[][]) {
  const queue = [...selectQueue];
  const inserted: { table: unknown; values: unknown }[] = [];
  const updated: { table: unknown; set: unknown }[] = [];
  const deleted: { table: unknown }[] = [];

  const tx = {
    select: vi.fn(() => makeSelectChain(queue.shift() ?? [])),
    insert: vi.fn((table: unknown) => ({
      values: (values: unknown) => {
        inserted.push({ table, values });
        return {
          then: (resolve: (value: undefined) => void) => resolve(undefined),
        };
      },
    })),
    update: vi.fn((table: unknown) => ({
      set: (set: unknown) => {
        updated.push({ table, set });
        return {
          where: () => ({
            then: (resolve: (value: undefined) => void) => resolve(undefined),
          }),
        };
      },
    })),
    delete: vi.fn((table: unknown) => ({
      where: () => {
        deleted.push({ table });
        return {
          then: (resolve: (value: undefined) => void) => resolve(undefined),
        };
      },
    })),
  };

  return { tx, inserted, updated, deleted };
}

function makeDb(selectQueue: Row[][]) {
  const { tx, inserted, updated, deleted } = makeTx(selectQueue);
  const db = {
    transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn(tx),
    ),
  };
  return { db, tx, inserted, updated, deleted };
}

describe("ProjectsService.saveSummary — one save (U8)", () => {
  it("persists the name, the manager, the member changes, and the module changes together in one transaction", async () => {
    const { db, inserted, updated, deleted } = makeDb([
      [{ id: "proj-1" }], // existingProject
      [{ id: "mgr-2", role: "Manager" }], // manager lookup
      [{ userId: "user-old-agent" }], // existingMembers
      [{ id: "user-new-agent", role: "Agent" }], // member candidates (role check)
      [{ id: "mod-1", projectId: "proj-1", name: "Networking" }], // existingModules
      [
        {
          id: "proj-1",
          name: "Renamed Project",
          managerId: "mgr-2",
          managerName: "Mgr Two",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ], // final project read
      [
        {
          projectId: "proj-1",
          userId: "user-new-agent",
          name: "New Agent",
          email: "new@x",
          role: "Agent",
        },
      ], // final member read
      [
        { id: "mod-1", projectId: "proj-1", name: "Networking Core" },
        { id: "mod-2", projectId: "proj-1", name: "Security" },
      ], // final module read
    ]);

    const svc = new ProjectsService(db as never, {} as never, {} as never);

    const result = await svc.saveSummary("proj-1", {
      name: "Renamed Project",
      managerId: "mgr-2",
      memberUserIds: ["user-new-agent"],
      modules: [
        { id: "mod-1", name: "Networking Core" },
        { name: "Security" },
      ],
    });

    // One transaction, not a PATCH plus separate per-item calls.
    expect(db.transaction).toHaveBeenCalledTimes(1);

    // Name + manager persisted in the same transaction.
    expect(updated.some((u) => u.set === undefined)).toBe(false);
    expect(
      updated.some(
        (u) =>
          (u.set as Record<string, unknown>)?.name === "Renamed Project" &&
          (u.set as Record<string, unknown>)?.managerId === "mgr-2",
      ),
    ).toBe(true);

    // Member changes persisted: new Agent added, stale member removed.
    expect(
      inserted.some((i) =>
        JSON.stringify(i.values).includes("user-new-agent"),
      ),
    ).toBe(true);
    expect(deleted.length).toBeGreaterThan(0);

    // Module changes persisted: existing module renamed, new module created.
    expect(
      updated.some(
        (u) => (u.set as Record<string, unknown>)?.name === "Networking Core",
      ),
    ).toBe(true);
    expect(
      inserted.some((i) =>
        JSON.stringify(i.values).includes("Security"),
      ),
    ).toBe(true);

    // The one response reflects all four together.
    expect(result.project).toMatchObject({
      name: "Renamed Project",
      managerId: "mgr-2",
    });
    expect(result.members).toEqual([
      expect.objectContaining({ userId: "user-new-agent" }),
    ]);
    expect(result.modules.map((m) => m.name)).toEqual([
      "Networking Core",
      "Security",
    ]);
  });

  it("allows a non-Agent user as a project member on the one save path", async () => {
    const { db, inserted } = makeDb([
      [{ id: "proj-1" }], // existingProject
      [{ id: "mgr-1", role: "Manager" }], // manager lookup
      [], // existingMembers (none yet)
      [{ id: "user-eu" }], // member candidates (any role)
      [], // existingModules
      [
        {
          id: "proj-1",
          name: "Project",
          managerId: "mgr-1",
          managerName: "Mgr",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ], // project after write
      [
        {
          projectId: "proj-1",
          userId: "user-eu",
          name: "End User",
          email: "eu@test.com",
          role: "EndUser",
        },
      ], // members after write
      [], // modules after write
    ]);

    const svc = new ProjectsService(db as never, {} as never, {} as never);

    const result = await svc.saveSummary("proj-1", {
      name: "Project",
      managerId: "mgr-1",
      memberUserIds: ["user-eu"],
      modules: [],
    });

    expect(inserted.some((i) => Array.isArray(i.values))).toBe(true);
    expect(result.members).toEqual([
      expect.objectContaining({ userId: "user-eu", role: "EndUser" }),
    ]);
  });

  it("a project with no members still returns an empty member list from the one save path", async () => {
    const { db } = makeDb([
      [{ id: "proj-1" }], // existingProject
      [{ id: "mgr-1", role: "Manager" }], // manager lookup
      [], // existingMembers
      // no member candidates select — memberIdsToAdd is empty
      [], // existingModules
      [
        {
          id: "proj-1",
          name: "Project",
          managerId: "mgr-1",
          managerName: "Mgr",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ], // final project read
      [], // final member read — still empty
      [], // final module read
    ]);

    const svc = new ProjectsService(db as never, {} as never, {} as never);

    const result = await svc.saveSummary("proj-1", {
      name: "Project",
      managerId: "mgr-1",
      memberUserIds: [],
      modules: [],
    });

    expect(result.members).toEqual([]);
  });
});
