import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import { KnowledgeService } from "./knowledge.service";

const ADMIN: AuthUser = {
  userId: "11111111-1111-4111-8111-111111111111",
  email: "admin@sadhox.local",
  name: "Admin",
  role: "Admin",
};
const AGENT: AuthUser = {
  userId: "22222222-2222-4222-8222-222222222222",
  email: "agent@sadhox.local",
  name: "Agent",
  role: "Agent",
};
const END_USER: AuthUser = {
  userId: "33333333-3333-4333-8333-333333333333",
  email: "user@sadhox.local",
  name: "User",
  role: "EndUser",
};

const CATEGORY_ID = "a1111111-1111-4111-8111-111111111111";
const ARTICLE_ID = "b1111111-1111-4111-8111-111111111111";
const TICKET_ID = "c1111111-1111-4111-8111-111111111111";

function articleRow(status: "Draft" | "Published") {
  return {
    id: ARTICLE_ID,
    title: "VPN access checklist",
    slug: "vpn-access-checklist",
    body: "Steps…",
    status,
    categoryId: CATEGORY_ID,
    categoryName: "Access",
    categorySlug: "access",
    authorId: ADMIN.userId,
    authorName: "Admin",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  };
}

describe("KnowledgeService (Phase 5 Day 24)", () => {
  let svc: KnowledgeService;
  let db: {
    select: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    db = {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    svc = new KnowledgeService(db as never);
  });

  it("createCategory sanitizes hostile name/slug/description", async () => {
    let values: Record<string, unknown> | undefined;
    db.insert.mockReturnValue({
      values: vi.fn((row: Record<string, unknown>) => {
        values = row;
        return {
          returning: vi.fn(async () => [{ id: CATEGORY_ID, ...row }]),
        };
      }),
    });

    await svc.createCategory({
      name: '<script>alert(1)</script>Access',
      slug: "Access-Guide",
      description: '<img src=x onerror="alert(1)">VPN help',
    });

    expect(values).toMatchObject({
      name: "alert(1) Access",
      slug: "access-guide",
      description: "VPN help",
    });
  });

  it("deleteCategory rejects when articles still reference it", async () => {
    db.select
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => [{ id: CATEGORY_ID }]),
          })),
        })),
      })
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => [{ id: ARTICLE_ID }]),
          })),
        })),
      });

    await expect(svc.deleteCategory(CATEGORY_ID)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it("getArticle by slug hides Draft from EndUser (404)", async () => {
    db.select.mockReturnValue({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(async () => [articleRow("Draft")]),
            })),
          })),
        })),
      })),
    });

    await expect(
      svc.getArticle(END_USER, "vpn-access-checklist"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("getArticle by slug returns Draft for Admin", async () => {
    const draft = articleRow("Draft");
    db.select.mockReturnValue({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(async () => [draft]),
            })),
          })),
        })),
      })),
    });

    await expect(svc.getArticle(ADMIN, "vpn-access-checklist")).resolves.toEqual(
      draft,
    );
  });

  it("linkArticle rejects Draft articles", async () => {
    // assertCanAccessTicket → incident exists + reporter match for EndUser path skipped (Agent)
    db.select
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => [
              { id: TICKET_ID, reporterId: END_USER.userId },
            ]),
          })),
        })),
      })
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => [
              {
                id: ARTICLE_ID,
                status: "Draft",
                title: "WIP",
                slug: "wip",
              },
            ]),
          })),
        })),
      });

    await expect(
      svc.linkArticle(AGENT, "incident", TICKET_ID, ARTICLE_ID),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("linkArticle forbids EndUser", async () => {
    await expect(
      svc.linkArticle(END_USER, "incident", TICKET_ID, ARTICLE_ID),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("listLinks EndUser cannot list another user's incident (IDOR)", async () => {
    db.select.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => [
            { id: TICKET_ID, reporterId: ADMIN.userId },
          ]),
        })),
      })),
    });

    await expect(
      svc.listLinks(END_USER, "incident", TICKET_ID),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("listArticles for Agent only applies Published filter in query path", async () => {
    const whereSpy = vi.fn(() => ({
      orderBy: vi.fn(() => ({
        limit: vi.fn(async () => []),
      })),
    }));
    db.select.mockReturnValue({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: whereSpy,
          })),
        })),
      })),
    });

    await svc.listArticles(AGENT, {});
    // Non-Admin path must pass a where clause (Published filter).
    expect(whereSpy).toHaveBeenCalled();
    expect(whereSpy.mock.calls[0][0]).toBeDefined();
  });

  it("listArticles for Admin may omit status filter (undefined where)", async () => {
    const whereSpy = vi.fn(() => ({
      orderBy: vi.fn(() => ({
        limit: vi.fn(async () => []),
      })),
    }));
    db.select.mockReturnValue({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: whereSpy,
          })),
        })),
      })),
    });

    await svc.listArticles(ADMIN, {});
    expect(whereSpy).toHaveBeenCalledWith(undefined);
  });
});
