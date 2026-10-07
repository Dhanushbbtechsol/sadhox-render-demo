import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { ProjectAccessService } from "./project-access.service";
import { ProjectScopeService } from "./project-scope.service";
import { ProjectsService } from "./projects.service";

const admin = {
  userId: "admin-1",
  email: "a@x",
  name: "Admin",
  role: "Admin" as const,
};

const manager = {
  userId: "mgr-1",
  email: "m@x",
  name: "Mgr",
  role: "Manager" as const,
};

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
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          onConflictDoNothing: vi.fn(async () => undefined),
        })),
      })),
      _queue: [
        {
          id: "proj-1",
          name: "P",
          managerId: "mgr-1",
          createdAt: new Date(),
          managerName: "Mgr",
        },
        { id: "user-mgr", name: "M", email: "m@x", role: "Manager" },
      ] as unknown[],
    };
    // loadProject join shape for first select; assertUserRole for second
    db.select = vi.fn(() => ({
      from: vi.fn(() => ({
        leftJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => [
              {
                project: {
                  id: "proj-1",
                  name: "P",
                  managerId: "mgr-1",
                  createdAt: new Date(),
                },
                managerName: "Mgr",
              },
            ]),
          })),
        })),
        where: vi.fn(() => ({
          limit: vi.fn(async () => [
            { id: "user-mgr", name: "M", email: "m@x", role: "Manager" },
          ]),
        })),
      })),
    }));
    const svc = new ProjectsService(
      db as never,
      {} as unknown as ProjectAccessService,
    );

    await expect(
      svc.addMember(admin, "proj-1", { userId: "user-mgr" }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("rejects Admin as project member", async () => {
    const db = {
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          onConflictDoNothing: vi.fn(async () => undefined),
        })),
      })),
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          leftJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(async () => [
                {
                  project: {
                    id: "proj-1",
                    name: "P",
                    managerId: "mgr-1",
                    createdAt: new Date(),
                  },
                  managerName: "Mgr",
                },
              ]),
            })),
          })),
          where: vi.fn(() => ({
            limit: vi.fn(async () => [
              {
                id: "user-admin",
                name: "A",
                email: "a@x",
                role: "Admin",
              },
            ]),
          })),
        })),
      })),
    };
    const svc = new ProjectsService(
      db as never,
      {} as unknown as ProjectAccessService,
    );

    await expect(
      svc.addMember(admin, "proj-1", { userId: "user-admin" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("allows Agent membership insert", async () => {
    const db = {
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          onConflictDoNothing: vi.fn(async () => undefined),
        })),
      })),
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          leftJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(async () => [
                {
                  project: {
                    id: "proj-1",
                    name: "P",
                    managerId: "mgr-1",
                    createdAt: new Date(),
                  },
                  managerName: "Mgr",
                },
              ]),
            })),
          })),
          where: vi.fn(() => ({
            limit: vi.fn(async () => [
              {
                id: "user-agent",
                name: "Agent",
                email: "ag@x",
                role: "Agent",
              },
            ]),
          })),
        })),
      })),
    };
    const svc = new ProjectsService(
      db as never,
      {} as unknown as ProjectAccessService,
    );

    await expect(
      svc.addMember(admin, "proj-1", { userId: "user-agent" }),
    ).resolves.toMatchObject({
      userId: "user-agent",
      role: "Agent",
    });
    expect(db.insert).toHaveBeenCalled();
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
          leftJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn(async () => [
                {
                  project: {
                    id: "proj-own",
                    name: "Mine",
                    managerId: "mgr-1",
                    createdAt: new Date(),
                  },
                  managerName: "Mgr",
                },
              ]),
            })),
          })),
        })),
      })),
    };
    const svc = new ProjectsService(
      db as never,
      access as unknown as ProjectAccessService,
    );

    const result = await svc.list(manager);
    expect(access.listAccessibleProjectIds).toHaveBeenCalled();
    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.id).toBe("proj-own");
  });

  it("get: Manager forbidden on inaccessible project", async () => {
    const access = {
      listAccessibleProjectIds: vi.fn(),
      canAccess: vi.fn(async () => false),
    };
    const svc = new ProjectsService(
      {} as never,
      access as unknown as ProjectAccessService,
    );

    await expect(svc.get(manager, "proj-other")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("create rejects non-Manager managerId", async () => {
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => [
              { id: "agent-1", name: "A", email: "a@x", role: "Agent" },
            ]),
          })),
        })),
      })),
      insert: vi.fn(),
    };
    const svc = new ProjectsService(
      db as never,
      {} as unknown as ProjectAccessService,
    );
    await expect(
      svc.create(admin, { name: "X", managerId: "agent-1" }),
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
