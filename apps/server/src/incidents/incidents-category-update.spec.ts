import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { IncidentsService } from "./incidents.service";

const agentUser = {
  userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  email: "agent@sadhox.local",
  role: "Agent" as const,
};

const VALID_PAIRS = new Set([
  "Hardware::Laptop/Desktop",
  "Identity & Access::Password Reset",
]);

function buildService(incident: Record<string, unknown>) {
  const updatedRow = { ...incident };
  const incidentRow = {
    incident,
    reporterId: agentUser.userId,
    reporterName: "Agent",
    reporterEmail: agentUser.email,
    assigneeId: null,
    assigneeName: null,
    assigneeEmail: null,
  };
  const limitIncident = vi.fn(async () => [incidentRow]);
  const limitSla = vi.fn(async () => [{ resolveMinutes: 240 }]);
  const db = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        leftJoin: vi.fn(() => ({
          leftJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: limitIncident,
            })),
          })),
        })),
        where: vi.fn(() => ({
          limit: limitSla,
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn((patch: Record<string, unknown>) => {
        Object.assign(updatedRow, patch);
        return {
          where: vi.fn(() => ({
            returning: vi.fn(async () => [updatedRow]),
          })),
        };
      }),
    })),
  };

  const priorityCalc = {
    calculate: vi.fn(() => "P2"),
    resolveDueAt: vi.fn(() => new Date()),
  };

  const findActivePair = vi.fn(async (category: string, subcategory: string) => {
    if (VALID_PAIRS.has(`${category}::${subcategory}`)) {
      return { minPriority: null };
    }
    return null;
  });
  const assertActivePair = vi.fn(
    async (category: string, subcategory: string) => {
      const pair = await findActivePair(category, subcategory);
      if (!pair) {
        throw new BadRequestException(
          `Invalid ticket category/subcategory pair "${category}" / "${subcategory}"`,
        );
      }
      return pair;
    },
  );

  const service = new IncidentsService(
    db as never,
    priorityCalc as never,
    { assertActivePair, findActivePair } as never,
    { emitTicketUpdated: vi.fn() } as never,
    {} as never,
    {} as never,
    { record: vi.fn() } as never,
    {} as never,
    { assertCanAccessTicketProject: vi.fn(async () => undefined) } as never,
    {} as never,
  );

  // get() after update: reuse loadIncidentRow path
  vi.spyOn(service, "get").mockImplementation(async () => ({
    ...(updatedRow as object),
    assigneeName: null,
    reporterName: "Agent",
    reporter: null,
    assignee: null,
    slaTargetMinutes: null,
  })) as never;

  return { service, db, updatedRow };
}

const baseLegacy = {
  id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  title: "Legacy outage",
  description: "Users cannot send mail from Outlook client.",
  category: "Email",
  subcategory: "Other",
  impact: "High",
  urgency: "High",
  priority: "P1",
  status: "New",
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

const baseModern = {
  ...baseLegacy,
  category: "Hardware",
  subcategory: "Laptop/Desktop",
};

describe("IncidentsService.update category/subcategory effective pair", () => {
  it("rejects only-category change when stored subcategory is invalid for new category", async () => {
    const { service, db } = buildService(baseModern);
    await expect(
      service.update(agentUser, baseModern.id, {
        category: "Software & OS",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.update).not.toHaveBeenCalled();
  });

  it("rejects only-subcategory change invalid for stored category", async () => {
    const { service, db } = buildService(baseModern);
    await expect(
      service.update(agentUser, baseModern.id, {
        subcategory: "Password Reset",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.update).not.toHaveBeenCalled();
  });

  it("accepts both category and subcategory changing to a valid pair", async () => {
    const { service, db, updatedRow } = buildService(baseModern);
    await service.update(agentUser, baseModern.id, {
      category: "Identity & Access",
      subcategory: "Password Reset",
    });
    expect(db.update).toHaveBeenCalled();
    expect(updatedRow.category).toBe("Identity & Access");
    expect(updatedRow.subcategory).toBe("Password Reset");
  });

  it("skips pair validation when neither category nor subcategory changes (legacy Other editable)", async () => {
    const { service, db, updatedRow } = buildService(baseLegacy);
    await service.update(agentUser, baseLegacy.id, {
      title: "Legacy outage still editable",
    });
    expect(db.update).toHaveBeenCalled();
    expect(updatedRow.category).toBe("Email");
    expect(updatedRow.subcategory).toBe("Other");
    expect(updatedRow.title).toBe("Legacy outage still editable");
  });

  it("allows re-sending unchanged legacy category and Other without pair validation", async () => {
    const { service, db } = buildService(baseLegacy);
    await service.update(agentUser, baseLegacy.id, {
      category: "Email",
      subcategory: "Other",
      title: "Legacy outage retitled",
    });
    expect(db.update).toHaveBeenCalled();
  });
});
