import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import {
  assertAdminRole,
  assertAgentOrAdminRole,
  canTransitionRequestFulfillment,
  isPendingServiceRequestStatus,
} from "../common/approval-policy";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import { DRIZZLE } from "../database/database.constants";
import type { DrizzleDB } from "../database/database.module";
import {
  serviceCatalog,
  serviceRequests,
  users,
} from "../database/schema";
import { MailService } from "../mail/mail.service";
import { sanitizePlainText } from "../common/sanitize-plain-text";
import type {
  CreateServiceRequestDto,
  FulfillServiceRequestDto,
  RejectServiceRequestDto,
} from "./dto/service-request.dto";

function toApiStatus(status: string) {
  if (status === "InFulfillment") return "In Fulfillment";
  return status;
}

@Injectable()
export class ServiceRequestsService {
  private readonly logger = new Logger(ServiceRequestsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly mail: MailService,
  ) {}

  private async mapRow(row: {
    id: string;
    catalogId: string;
    catalogName: string | null;
    requesterId: string;
    requesterName: string | null;
    status: string;
    justification: string;
    urgency: string;
    fields: Record<string, string> | null;
    createdAt: Date;
    approverId: string | null;
    approvedAt: Date | null;
    rejectionReason: string | null;
    assigneeId: string | null;
    fulfillmentNotes: string | null;
    fulfilledAt: Date | null;
  }) {
    return {
      id: row.id,
      catalogId: row.catalogId,
      catalogName: row.catalogName ?? "Unknown service",
      requesterId: row.requesterId,
      requesterName: row.requesterName ?? "Unknown",
      status: toApiStatus(row.status),
      justification: row.justification,
      urgency: row.urgency,
      fields: row.fields ?? {},
      createdAt: row.createdAt.toISOString(),
      approverId: row.approverId ?? undefined,
      approvedAt: row.approvedAt?.toISOString(),
      rejectionReason: row.rejectionReason ?? undefined,
      assigneeId: row.assigneeId ?? undefined,
      fulfillmentNotes: row.fulfillmentNotes ?? undefined,
      fulfilledAt: row.fulfilledAt?.toISOString(),
    };
  }

  private selectListColumns() {
    return {
      id: serviceRequests.id,
      catalogId: serviceRequests.catalogId,
      catalogName: serviceCatalog.name,
      requesterId: serviceRequests.requesterId,
      requesterName: users.name,
      status: serviceRequests.status,
      justification: serviceRequests.justification,
      urgency: serviceRequests.urgency,
      fields: serviceRequests.fields,
      createdAt: serviceRequests.createdAt,
      approverId: serviceRequests.approverId,
      approvedAt: serviceRequests.approvedAt,
      rejectionReason: serviceRequests.rejectionReason,
      assigneeId: serviceRequests.assigneeId,
      fulfillmentNotes: serviceRequests.fulfillmentNotes,
      fulfilledAt: serviceRequests.fulfilledAt,
    };
  }

  async create(user: AuthUser, dto: CreateServiceRequestDto) {
    const [catalog] = await this.db
      .select()
      .from(serviceCatalog)
      .where(
        and(
          eq(serviceCatalog.id, dto.catalogId),
          eq(serviceCatalog.isActive, true),
        ),
      )
      .limit(1);

    if (!catalog) {
      throw new NotFoundException("Catalog item not found");
    }

    const [created] = await this.db
      .insert(serviceRequests)
      .values({
        catalogId: catalog.id,
        requesterId: user.userId,
        title: catalog.name,
        description: dto.justification,
        justification: dto.justification,
        urgency: dto.urgency,
        fields: dto.fields ?? {},
        status: "Submitted",
      })
      .returning();

<<<<<<< Updated upstream
    const [requester] = await this.db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, user.userId))
      .limit(1);

    await this.notifyAdminsOfSubmission(created.id, catalog.name, user, dto.urgency);
=======
    await this.notifyApproversOfSubmission(
      created.id,
      catalog.name,
      user,
      dto.urgency,
      projectId,
    );
>>>>>>> Stashed changes

    return this.mapRow({
      id: created.id,
      catalogId: created.catalogId,
      catalogName: catalog.name,
      requesterId: created.requesterId,
      requesterName: requester?.name ?? null,
      status: created.status,
      justification: created.justification,
      urgency: created.urgency,
      fields: created.fields,
      createdAt: created.createdAt,
      approverId: created.approverId,
      approvedAt: created.approvedAt,
      rejectionReason: created.rejectionReason,
      assigneeId: created.assigneeId,
      fulfillmentNotes: created.fulfillmentNotes,
      fulfilledAt: created.fulfilledAt,
    });
  }

  async list(user: AuthUser) {
    const base = this.db
      .select(this.selectListColumns())
      .from(serviceRequests)
      .leftJoin(serviceCatalog, eq(serviceRequests.catalogId, serviceCatalog.id))
      .leftJoin(users, eq(serviceRequests.requesterId, users.id));

    const rows =
      user.role === "EndUser"
        ? await base
            .where(eq(serviceRequests.requesterId, user.userId))
            .orderBy(desc(serviceRequests.createdAt))
        : await base.orderBy(desc(serviceRequests.createdAt));

    return {
      data: await Promise.all(rows.map((row) => this.mapRow(row))),
    };
  }

  async get(user: AuthUser, id: string) {
    const [row] = await this.db
      .select(this.selectListColumns())
      .from(serviceRequests)
      .leftJoin(serviceCatalog, eq(serviceRequests.catalogId, serviceCatalog.id))
      .leftJoin(users, eq(serviceRequests.requesterId, users.id))
      .where(eq(serviceRequests.id, id))
      .limit(1);

    if (!row) throw new NotFoundException("Service request not found");
    if (user.role === "EndUser" && row.requesterId !== user.userId) {
      throw new ForbiddenException("Cannot view this service request");
    }
    return this.mapRow(row);
  }

  async approve(user: AuthUser, id: string) {
    try {
      assertAdminRole(user.role);
    } catch {
      throw new ForbiddenException("Admin role required");
    }
    const existing = await this.requirePending(id);

    const [updated] = await this.db
      .update(serviceRequests)
      .set({
        status: "Approved",
        approverId: user.userId,
        approvedAt: new Date(),
        rejectionReason: null,
        updatedAt: new Date(),
      })
      .where(eq(serviceRequests.id, existing.id))
      .returning();

    await this.notifyRequesterDecision(updated.id, "Approved");
    return this.get(user, updated.id);
  }

  async reject(user: AuthUser, id: string, dto: RejectServiceRequestDto) {
    try {
      assertAdminRole(user.role);
    } catch {
      throw new ForbiddenException("Admin role required");
    }
    const reason = sanitizePlainText(dto.reason ?? "");
    if (!reason) {
      throw new BadRequestException("Rejection reason is required");
    }
    const existing = await this.requirePending(id);

    const [updated] = await this.db
      .update(serviceRequests)
      .set({
        status: "Rejected",
        approverId: user.userId,
        approvedAt: new Date(),
        rejectionReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(serviceRequests.id, existing.id))
      .returning();

    await this.notifyRequesterDecision(updated.id, "Rejected", reason);
    return this.get(user, updated.id);
  }

  async startFulfillment(user: AuthUser, id: string) {
    try {
      assertAgentOrAdminRole(user.role);
    } catch {
      throw new ForbiddenException("Agent or Admin role required");
    }

    const existing = await this.requireExisting(id);
    if (!canTransitionRequestFulfillment(existing.status, "InFulfillment")) {
      throw new BadRequestException(
        `Cannot start fulfillment from status ${existing.status}. Admin approval is required first.`,
      );
    }

    const [updated] = await this.db
      .update(serviceRequests)
      .set({
        status: "InFulfillment",
        assigneeId: user.userId,
        updatedAt: new Date(),
      })
      .where(eq(serviceRequests.id, existing.id))
      .returning();

    return this.get(user, updated.id);
  }

  async fulfill(user: AuthUser, id: string, dto: FulfillServiceRequestDto) {
    try {
      assertAgentOrAdminRole(user.role);
    } catch {
      throw new ForbiddenException("Agent or Admin role required");
    }
    const notes = sanitizePlainText(dto.notes ?? "");
    if (!notes) {
      throw new BadRequestException("Completion notes are required");
    }

    const existing = await this.requireExisting(id);
    if (!canTransitionRequestFulfillment(existing.status, "Fulfilled")) {
      throw new BadRequestException(
        `Cannot fulfill a request in status ${existing.status}. Start fulfillment after approval first.`,
      );
    }

    const [updated] = await this.db
      .update(serviceRequests)
      .set({
        status: "Fulfilled",
        assigneeId: existing.assigneeId ?? user.userId,
        fulfillmentNotes: notes,
        fulfilledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(serviceRequests.id, existing.id))
      .returning();

    await this.notifyRequesterDecision(updated.id, "Fulfilled", notes);
    return this.get(user, updated.id);
  }

  private async requirePending(id: string) {
    const existing = await this.requireExisting(id);
    if (!isPendingServiceRequestStatus(existing.status)) {
      throw new BadRequestException(
        `Cannot approve/reject a request in status ${existing.status}`,
      );
    }
    return existing;
  }

  private async requireExisting(id: string) {
    const [existing] = await this.db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException("Service request not found");
    return existing;
  }

  private async notifyAdminsOfSubmission(
    requestId: string,
    requestTitle: string,
    submitter: AuthUser,
    urgency: string,
  ) {
    try {
      const admins = await this.db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.role, "Admin"));

      await Promise.all(
        admins.map((admin) =>
          this.mail.sendRequestReviewRequest(admin.email, {
            requestId,
            requestTitle,
            submitterName: submitter.name ?? submitter.email,
            urgency,
          }),
        ),
      );
    } catch (err) {
      this.logger.warn(
        `Failed to enqueue request review emails for ${requestId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  private async notifyRequesterDecision(
    requestId: string,
    decision: "Approved" | "Rejected" | "Fulfilled",
    reason?: string,
  ) {
    try {
      const [row] = await this.db
        .select({
          title: serviceRequests.title,
          email: users.email,
        })
        .from(serviceRequests)
        .innerJoin(users, eq(serviceRequests.requesterId, users.id))
        .where(eq(serviceRequests.id, requestId))
        .limit(1);
      if (!row?.email) return;
      await this.mail.sendRequestDecision(row.email, {
        requestId,
        requestTitle: row.title,
        decision,
        reason,
      });
    } catch (err) {
      this.logger.warn(
        `Failed to enqueue request decision email for ${requestId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
