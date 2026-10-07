import { describe, expect, it, vi } from "vitest";
import { ProjectAccessService } from "./project-access.service";

function chainLimit(result: unknown) {
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(async () => result),
      })),
    })),
  };
}

function chainWhere(result: unknown) {
  return {
    from: vi.fn(() => ({
      where: vi.fn(async () => result),
    })),
  };
}

describe("ProjectAccessService.canAccess (reachable product states)", () => {
  it("Admin always has access (including null project)", async () => {
    const access = new ProjectAccessService({} as never);
    await expect(
      access.canAccess({ userId: "admin", role: "Admin" }, null),
    ).resolves.toBe(true);
    await expect(
      access.canAccess({ userId: "admin", role: "Admin" }, "proj-x"),
    ).resolves.toBe(true);
  });

  it("returns false for no project (null) for non-Admin", async () => {
    const access = new ProjectAccessService({} as never);
    await expect(
      access.canAccess({ userId: "mgr", role: "Manager" }, null),
    ).resolves.toBe(false);
    await expect(
      access.canAccess({ userId: "agent", role: "Agent" }, undefined),
    ).resolves.toBe(false);
  });

  it("reachable: Manager owns A → access via manager_id only", async () => {
    const db = {
      select: vi.fn().mockReturnValueOnce(chainLimit([{ id: "proj-a" }])),
    };
    const access = new ProjectAccessService(db as never);
    await expect(
      access.canAccess({ userId: "mgr-1", role: "Manager" }, "proj-a"),
    ).resolves.toBe(true);
    // manager_id path hit — membership query not needed
    expect(db.select).toHaveBeenCalledTimes(1);
  });

  it("reachable: Manager does not own B → false (no membership for Managers via API)", async () => {
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(chainLimit([]))
        .mockReturnValueOnce(chainLimit([])),
    };
    const access = new ProjectAccessService(db as never);
    await expect(
      access.canAccess({ userId: "mgr-1", role: "Manager" }, "proj-b"),
    ).resolves.toBe(false);
    expect(db.select).toHaveBeenCalledTimes(2);
  });

  it("reachable: Agent member of B → access via project_members only", async () => {
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(chainLimit([])) // not a manager_id owner
        .mockReturnValueOnce(chainLimit([{ projectId: "proj-b" }])),
    };
    const access = new ProjectAccessService(db as never);
    await expect(
      access.canAccess({ userId: "agent-1", role: "Agent" }, "proj-b"),
    ).resolves.toBe(true);
  });

  it("reachable: Agent not a member → false", async () => {
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(chainLimit([]))
        .mockReturnValueOnce(chainLimit([])),
    };
    const access = new ProjectAccessService(db as never);
    await expect(
      access.canAccess({ userId: "agent-1", role: "Agent" }, "proj-x"),
    ).resolves.toBe(false);
  });

  it("EndUser never has project access", async () => {
    const access = new ProjectAccessService({} as never);
    await expect(
      access.canAccess({ userId: "eu", role: "EndUser" }, "proj-1"),
    ).resolves.toBe(false);
  });

  /**
   * Defense-in-depth only: if a stale project_members row exists (e.g. direct
   * DB edit), canAccess still grants via the membership OR path.
   * The normal path is closed by AdminService.updateUserRole — promoting to
   * Manager deletes memberships in the same transaction (see admin.user-role.spec).
   */
  it("defense-in-depth: stale project_members row still grants canAccess if present", async () => {
    const db = {
      select: vi
        .fn()
        // not manager_id of this project
        .mockReturnValueOnce(chainLimit([]))
        // stale membership row still present
        .mockReturnValueOnce(chainLimit([{ projectId: "proj-stale" }])),
    };
    const access = new ProjectAccessService(db as never);
    await expect(
      access.canAccess(
        { userId: "promoted-1", role: "Manager" },
        "proj-stale",
      ),
    ).resolves.toBe(true);
    expect(db.select).toHaveBeenCalledTimes(2);
  });
});

describe("ProjectAccessService.canApprove (ownership only)", () => {
  it("Admin can approve any project including null", async () => {
    const access = new ProjectAccessService({} as never);
    await expect(
      access.canApprove({ userId: "admin", role: "Admin" }, null),
    ).resolves.toBe(true);
    await expect(
      access.canApprove({ userId: "admin", role: "Admin" }, "proj-x"),
    ).resolves.toBe(true);
  });

  it("Manager can approve only when manager_id = self", async () => {
    const db = {
      select: vi.fn().mockReturnValueOnce(chainLimit([{ id: "proj-a" }])),
    };
    const access = new ProjectAccessService(db as never);
    await expect(
      access.canApprove({ userId: "mgr-1", role: "Manager" }, "proj-a"),
    ).resolves.toBe(true);
  });

  it("Manager cannot approve null-project tickets", async () => {
    const access = new ProjectAccessService({} as never);
    await expect(
      access.canApprove({ userId: "mgr-1", role: "Manager" }, null),
    ).resolves.toBe(false);
  });

  it("Manager membership alone does not grant approve (ownership required)", async () => {
    // canApprove only queries manager_id — never checks project_members
    const db = {
      select: vi.fn().mockReturnValueOnce(chainLimit([])),
    };
    const access = new ProjectAccessService(db as never);
    await expect(
      access.canApprove({ userId: "mgr-1", role: "Manager" }, "proj-member-only"),
    ).resolves.toBe(false);
    expect(db.select).toHaveBeenCalledTimes(1);
  });
});

describe("ProjectAccessService.listAccessibleProjectIds", () => {
  it("Admin lists all projects", async () => {
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(async () => [{ id: "a" }, { id: "b" }]),
      })),
    };
    const access = new ProjectAccessService(db as never);
    await expect(
      access.listAccessibleProjectIds({ userId: "admin", role: "Admin" }),
    ).resolves.toEqual(["a", "b"]);
  });

  it("EndUser gets empty list", async () => {
    const access = new ProjectAccessService({} as never);
    await expect(
      access.listAccessibleProjectIds({ userId: "eu", role: "EndUser" }),
    ).resolves.toEqual([]);
  });

  it("reachable: Manager list is projects they own (manager_id)", async () => {
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(chainWhere([{ id: "proj-a" }]))
        .mockReturnValueOnce(chainWhere([])), // no memberships in clean product state
    };
    const access = new ProjectAccessService(db as never);
    await expect(
      access.listAccessibleProjectIds({ userId: "mgr-1", role: "Manager" }),
    ).resolves.toEqual(["proj-a"]);
  });

  it("reachable: Agent list is project_members only", async () => {
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(chainWhere([])) // owns none
        .mockReturnValueOnce(chainWhere([{ id: "proj-b" }])),
    };
    const access = new ProjectAccessService(db as never);
    await expect(
      access.listAccessibleProjectIds({ userId: "agent-1", role: "Agent" }),
    ).resolves.toEqual(["proj-b"]);
  });

  /**
   * Defense-in-depth: leftover memberships still appear in listAccessibleProjectIds.
   * Normal promotion path clears them via AdminService.updateUserRole.
   */
  it("defense-in-depth: listAccessibleProjectIds includes leftover membership if present", async () => {
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(chainWhere([{ id: "proj-owned" }]))
        .mockReturnValueOnce(chainWhere([{ id: "proj-stale-member" }])),
    };
    const access = new ProjectAccessService(db as never);
    const ids = await access.listAccessibleProjectIds({
      userId: "promoted-1",
      role: "Manager",
    });
    expect(ids.sort()).toEqual(["proj-owned", "proj-stale-member"]);
  });
});
