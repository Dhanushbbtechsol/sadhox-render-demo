import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { ProjectAccessService } from "./project-access.service";
import { ProjectScopeService } from "./project-scope.service";
import { ProjectsService } from "./projects.service";

/**
 * U8 — the combined project summary/edit replaces the separate Edit /
 * Members / Modules dialogs. One save must cover name, manager, members,
 * and modules together, and member add must stay Agent-only (KTD6).
 */
describe("ProjectsService — combined project summary save (U8)", () => {
  it("persists an Agent member and a module change as part of one save", async () => {
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => db._queue.shift()),
          })),
        })),
      })),
      insert: vi.fn((table: unknown) => ({
        values: vi.fn(() => ({
          returning: vi.fn(async () => {
            db._inserted.push(table);
            return db._returns.shift();
          }),
        })),
      })),
      _queue: [
        [{ id: "proj-1" }], // addMember: assertProjectExists
        [{ id: "user-agent", role: "Agent" }], // addMember: user role lookup
        [{ id: "proj-1" }], // createModule: assertProjectExists
      ] as unknown[],
      _returns: [
        [{ projectId: "proj-1", userId: "user-agent" }], // addMember insert
        [{ id: "mod-1", projectId: "proj-1", name: "Networking" }], // createModule insert
      ] as unknown[],
      _inserted: [] as unknown[],
    };
    const scope = new ProjectScopeService(db as never);
    const access = new ProjectAccessService(db as never);
    const svc = new ProjectsService(db as never, scope, access);

    const member = await svc.addMember("proj-1", { userId: "user-agent" });
    const created = await svc.createModule("proj-1", { name: "Networking" });

    expect(member).toEqual({ projectId: "proj-1", userId: "user-agent" });
    expect(created).toEqual({
      id: "mod-1",
      projectId: "proj-1",
      name: "Networking",
    });
    expect(db._inserted).toHaveLength(2);
  });

  it("rejects a Manager as a project member (KTD6 — members are Agents only)", async () => {
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
        [{ id: "proj-1" }], // assertProjectExists
        [{ id: "user-mgr", role: "Manager" }], // user role lookup
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

  it("a project with no members still returns an empty member list", async () => {
    let selectCall = 0;
    const db = {
      select: vi.fn(() => {
        selectCall += 1;
        if (selectCall === 1) {
          // getById (Admin): select().from(projects).leftJoin(users).where().limit()
          return {
            from: vi.fn(() => ({
              leftJoin: vi.fn(() => ({
                where: vi.fn(() => ({
                  limit: vi.fn(async () => [
                    {
                      id: "proj-1",
                      name: "Empty project",
                      managerId: "mgr-1",
                      managerName: "Mgr",
                    },
                  ]),
                })),
              })),
            })),
          };
        }
        // listMembers: select().from(projectMembers).innerJoin(users).where()
        return {
          from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
              where: vi.fn(async () => []),
            })),
          })),
        };
      }),
    };
    const svc = new ProjectsService(
      db as never,
      {} as never,
      {} as never,
    );

    const rows = await svc.listMembers(
      { userId: "admin-1", email: "a@x", name: "Admin", role: "Admin" },
      "proj-1",
    );

    expect(rows).toEqual([]);
  });
});
