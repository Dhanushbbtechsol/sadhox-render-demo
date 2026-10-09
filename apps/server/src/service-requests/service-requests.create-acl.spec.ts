import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { ServiceRequestsService } from "./service-requests.service";

describe("ServiceRequestsService.create project ACL (audit A01/A04)", () => {
  const agent = {
    userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    email: "agent@sadhox.local",
    role: "Agent" as const,
    name: "Agent",
  };

  it("rejects create when resolveTicketProjectFields denies foreign project", async () => {
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => [
              {
                id: "catalog-1",
                name: "Laptop",
                isActive: true,
              },
            ]),
          })),
        })),
      })),
      insert: vi.fn(),
    };
    const projectsService = {
      resolveTicketProjectFields: vi.fn().mockRejectedValue(
        new ForbiddenException("Cannot access this project"),
      ),
    };

    const service = new ServiceRequestsService(
      db as never,
      { sendRequestReviewRequest: vi.fn() } as never,
      { record: vi.fn() } as never,
      {} as never,
      projectsService as never,
    );

    await expect(
      service.create(agent, {
        catalogId: "catalog-1",
        justification: "need laptop",
        urgency: "Medium",
        projectId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(projectsService.resolveTicketProjectFields).toHaveBeenCalledWith(
      agent,
      "ffffffff-ffff-4fff-8fff-ffffffffffff",
      undefined,
    );
    expect(db.insert).not.toHaveBeenCalled();
  });
});
