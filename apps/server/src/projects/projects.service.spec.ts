import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { ProjectAccessService } from "./project-access.service";
import { ProjectScopeService } from "./project-scope.service";
import { ProjectsService } from "./projects.service";

describe("ProjectsService.addMember (Phase 6)", () => {
  it("rejects Manager as project member", async () => {
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => db._queue.shift()),
          })),
        })),
      })),
      insert: vi.fn(),
      _queue: [
        [{ id: "proj-1" }],
        [{ id: "user-mgr", role: "Manager" }],
      ] as unknown[],
    };
    const scope = new ProjectScopeService(db as never);
    const access = new ProjectAccessService(db as never);
    const svc = new ProjectsService(db as never, scope, access);

    await expect(
      svc.addMember("proj-1", { userId: "user-mgr" }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("rejects Admin as project member", async () => {
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => db._queue.shift()),
          })),
        })),
      })),
      insert: vi.fn(),
      _queue: [[{ id: "proj-1" }], [{ id: "user-admin", role: "Admin" }]],
    };
    const scope = new ProjectScopeService(db as never);
    const access = new ProjectAccessService(db as never);
    const svc = new ProjectsService(db as never, scope, access);

    await expect(
      svc.addMember("proj-1", { userId: "user-admin" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("allows Agent membership insert", async () => {
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => db._queue.shift()),
          })),
        })),
      })),
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          returning: vi.fn(async () => [
            { projectId: "proj-1", userId: "user-agent" },
          ]),
        })),
      })),
      _queue: [[{ id: "proj-1" }], [{ id: "user-agent", role: "Agent" }]],
    };
    const scope = new ProjectScopeService(db as never);
    const access = new ProjectAccessService(db as never);
    const svc = new ProjectsService(db as never, scope, access);

    await expect(
      svc.addMember("proj-1", { userId: "user-agent" }),
    ).resolves.toEqual({
      projectId: "proj-1",
      userId: "user-agent",
    });
  });
});

describe("ProjectsService CRUD role rules", () => {
  it("list: Manager only sees accessible projects", async () => {
    const access = {
      listAccessibleProjectIds: vi.fn(async () => ["proj-own"]),
      canAccess: vi.fn(),
    };
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(async () => [
            { id: "proj-own", name: "Mine", managerId: "mgr-1" },
          ]),
        })),
      })),
    };
    const svc = new ProjectsService(
      db as never,
      {} as never,
      access as unknown as ProjectAccessService,
    );

    const rows = await svc.list({
      userId: "mgr-1",
      email: "m@x",
      name: "Mgr",
      role: "Manager",
    });
    expect(access.listAccessibleProjectIds).toHaveBeenCalled();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe("proj-own");
  });

  it("getById: Manager forbidden on inaccessible project", async () => {
    const access = {
      listAccessibleProjectIds: vi.fn(),
      canAccess: vi.fn(async () => false),
    };
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => [
              { id: "proj-other", name: "Other", managerId: "other" },
            ]),
          })),
        })),
      })),
    };
    const svc = new ProjectsService(
      db as never,
      {} as never,
      access as unknown as ProjectAccessService,
    );

    await expect(
      svc.getById(
        { userId: "mgr-1", email: "m@x", name: "Mgr", role: "Manager" },
        "proj-other",
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("create rejects non-Manager managerId", async () => {
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => [{ id: "agent-1", role: "Agent" }]),
          })),
        })),
      })),
      insert: vi.fn(),
    };
    const svc = new ProjectsService(
      db as never,
      {} as never,
      {} as never,
    );
    await expect(
      svc.create({ name: "X", managerId: "agent-1" }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.insert).not.toHaveBeenCalled();
  });
});

describe("ProjectScopeService.assertModuleBelongsToProject", () => {
  it("rejects moduleId without projectId", async () => {
    const scope = new ProjectScopeService({} as never);
    await expect(
      scope.assertModuleBelongsToProject(null, "mod-1"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects module from a different project", async () => {
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => [
              { id: "mod-1", projectId: "other-proj" },
            ]),
          })),
        })),
      })),
    };
    const scope = new ProjectScopeService(db as never);
    await expect(
      scope.assertModuleBelongsToProject("proj-1", "mod-1"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
