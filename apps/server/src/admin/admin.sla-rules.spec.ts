import { BadRequestException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveDueAt } from "../incidents/priority";
import { AdminService } from "./admin.service";

type RuleRow = {
  id: string;
  priority: "P1" | "P2" | "P3" | "P4";
  responseMinutes: number;
  resolveMinutes: number;
  createdAt: Date;
};

/**
 * PATCH /admin/sla-rules updates sla_rules.resolveMinutes, which
 * IncidentsService.lookupResolveMinutes reads when stamping slaDueAt —
 * the field the Day 12 SlaProcessor breach worker compares against now.
 */
describe("Admin SLA rules API (service)", () => {
  let store: RuleRow[];
  let admin: AdminService;

  beforeEach(() => {
    store = [
      {
        id: "sla-p1",
        priority: "P1",
        responseMinutes: 15,
        resolveMinutes: 240,
        createdAt: new Date("2026-01-01T00:00:00Z"),
      },
      {
        id: "sla-p2",
        priority: "P2",
        responseMinutes: 60,
        resolveMinutes: 480,
        createdAt: new Date("2026-01-01T00:00:00Z"),
      },
    ];

    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          orderBy: vi.fn(async () => [...store]),
          where: vi.fn(() => ({
            limit: vi.fn(async (n: number) => {
              // updateSlaRule existence check — match by last update target
              return store.slice(0, n).map((r) => ({ id: r.id }));
            }),
          })),
        })),
      })),
      update: vi.fn(() => ({
        set: vi.fn((patch: Partial<RuleRow>) => ({
          where: vi.fn(() => ({
            returning: vi.fn(async () => {
              // Tests call update for a known priority via service; apply to P2 by default
              // when only one update path is exercised. We bind priority via closure below.
              const target = (db as { _updatePriority?: string })._updatePriority;
              const idx = store.findIndex((r) => r.priority === target);
              if (idx < 0) return [];
              store[idx] = { ...store[idx], ...patch };
              return [store[idx]];
            }),
          })),
        })),
      })),
      _updatePriority: "P2" as string,
    };

    // Wrap updateSlaRule's select/where to filter by priority equality in mock
    db.select = vi.fn(() => ({
      from: vi.fn(() => ({
        orderBy: vi.fn(async () =>
          [...store].sort((a, b) => a.priority.localeCompare(b.priority)),
        ),
        where: vi.fn((_cond: unknown) => ({
          limit: vi.fn(async () => {
            const p = db._updatePriority as RuleRow["priority"];
            const hit = store.find((r) => r.priority === p);
            return hit ? [{ id: hit.id }] : [];
          }),
        })),
      })),
    }));

    admin = new AdminService(
      db as never,
      {} as never,
      {} as never,
      {} as never,
    );

    // Intercept updateSlaRule to set mock priority before DB calls
    const realUpdate = admin.updateSlaRule.bind(admin);
    admin.updateSlaRule = async (priority, dto) => {
      db._updatePriority = priority;
      return realUpdate(priority, dto);
    };
  });

  it("listSlaRules returns frontend SlaRule shape", async () => {
    const rows = await admin.listSlaRules();
    expect(rows).toEqual([
      {
        id: "sla-p1",
        priority: "P1",
        responseMinutes: 15,
        resolveMinutes: 240,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "sla-p2",
        priority: "P2",
        responseMinutes: 60,
        resolveMinutes: 480,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
  });

  it("rejects priority outside P1–P4", async () => {
    await expect(
      admin.updateSlaRule("P9", { responseMinutes: 10, resolveMinutes: 20 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("404 when priority row missing", async () => {
    store = [];
    await expect(
      admin.updateSlaRule("P1", { responseMinutes: 10, resolveMinutes: 20 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("PATCH changes resolveMinutes that stamp slaDueAt for the breach worker", async () => {
    const from = new Date("2026-06-01T12:00:00.000Z");
    const beforeMinutes = store.find((r) => r.priority === "P2")!.resolveMinutes;
    const beforeDue = resolveDueAt("P2", from, beforeMinutes);

    const updated = await admin.updateSlaRule("P2", {
      responseMinutes: 30,
      resolveMinutes: 90,
    });
    expect(updated.resolveMinutes).toBe(90);

    // Same value IncidentsService.lookupResolveMinutes would return after PATCH
    const minutesAfter = store.find((r) => r.priority === "P2")!.resolveMinutes;
    expect(minutesAfter).toBe(90);

    const afterDue = resolveDueAt("P2", from, minutesAfter);
    expect(afterDue.getTime() - from.getTime()).toBe(90 * 60_000);
    expect(afterDue.getTime()).not.toBe(beforeDue.getTime());
    // SlaProcessor flags when now >= slaDueAt — earlier due ⇒ earlier breach
    expect(afterDue.getTime()).toBeLessThan(beforeDue.getTime());
  });
});
