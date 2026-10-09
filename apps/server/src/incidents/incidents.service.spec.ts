import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { IncidentsService } from "./incidents.service";

describe("IncidentsService.update assignee role", () => {
  const agentUser = {
    userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    email: "agent@sadhox.local",
    role: "Agent" as const,
  };

  const endUserId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

  const incident = {
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    title: "Outage",
    description: "Users cannot send mail",
    category: "Collaboration",
    subcategory: "Email & Calendar",
    impact: "High",
    urgency: "High",
    priority: "P1" as const,
    status: "New" as const,
    assignedTo: null,
    reporterId: agentUser.userId,
    projectId: null,
    moduleId: null,
    slaDueAt: new Date(),
    slaBreached: false,
    resolutionNotes: null,
    resolvedAt: null,
    closedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("rejects PATCH assignedTo when target is EndUser (400)", async () => {
    let selectCalls = 0;
    const db = {
      select: vi.fn(() => {
        selectCalls += 1;
        if (selectCalls === 1) {
          // loadIncidentRow
          return {
            from: vi.fn(() => ({
              leftJoin: vi.fn(() => ({
                leftJoin: vi.fn(() => ({
                  where: vi.fn(() => ({
                    limit: vi.fn(async () => [
                      {
                        incident,
                        reporterId: agentUser.userId,
                        reporterName: "Agent",
                        reporterEmail: agentUser.email,
                        assigneeId: null,
                        assigneeName: null,
                        assigneeEmail: null,
                      },
                    ]),
                  })),
                })),
              })),
            })),
          };
        }
        // assertAssigneeInPool user lookup
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(async () => [
                {
                  id: endUserId,
                  email: "end@sadhox.local",
                  name: "End User",
                  role: "EndUser",
                },
              ]),
            })),
          })),
        };
      }),
      update: vi.fn(),
    };

    const service = new IncidentsService(
      db as never,
      { calculate: vi.fn(), resolveDueAt: vi.fn() } as never,
      { emitTicketUpdated: vi.fn() } as never,
      { isInPool: vi.fn(async () => false) } as never,
      { sendTicketAssigned: vi.fn() } as never,
      { record: vi.fn() } as never,
      {} as never,
      { assertCanAccessTicketProject: vi.fn(async () => undefined) } as never,
      {} as never,
    );

    await expect(
      service.update(agentUser, incident.id, { assignedTo: endUserId }),
    ).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof BadRequestException &&
        err.message === "Assignee must be an Agent or Admin",
    );

    expect(db.update).not.toHaveBeenCalled();
  });
});
