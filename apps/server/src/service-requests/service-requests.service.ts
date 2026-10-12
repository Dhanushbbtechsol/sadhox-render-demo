import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { and, desc, eq, inArray, SQL } from "drizzle-orm";
import {
  assertAgentOrAdminRole,
  canTransitionRequestFulfillment,
  isPendingServiceRequestStatus,
} from "../common/approval-policy";
import { nextApproval } from "../common/approval-chain";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import { DRIZZLE } from "../database/database.constants";
import type { DrizzleDB } from "../database/database.module";
import {
  modules,
  projects,
  serviceCatalog,
  serviceRequests,
  users,
} from "../database/schema";
import { MailService } from "../mail/mail.service";
import { NotificationService } from "../notifications/notification.service";
import { recipientIds } from "../notifications/recipients";
import { ProjectAccessService } from "../projects/project-access.service";
import { ProjectsService } from "../projects/projects.service";
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
    private readonly notifications: NotificationService,
    private readonly projectAccess: ProjectAccessService,
    private readonly projectsService: ProjectsService,
  ) {}

  private async mapRow(
    row: {
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
      projectId: string | null;
      projectName: string | null;
      moduleId: string | null;
      moduleName: string | null;
      requesterReportsToId: string | null;
    },
    redactProjectFields: boolean,
  ) {
    const base = {
      id: row.id,
      catalogId: row.catalogId,
      catalogName: row.catalogName ?? "Unknown service",
      requesterId: row.requesterId,
      requesterName: row.requesterName ?? "Unknown",
      requesterReportsToId: row.requesterReportsToId ?? null,
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
    if (redactProjectFields) {
      return base;
    }
    return {
      ...base,
      projectId: row.projectId ?? null,
      projectName: row.projectName ?? null,
      moduleId: row.moduleId ?? null,
      moduleName: row.moduleName ?? null,
    };
  }

  private selectListColumns() {
    return {
      id: serviceRequests.id,
      catalogId: serviceRequests.catalogId,
      catalogName: serviceCatalog.name,
      requesterId: serviceRequests.requesterId,
      requesterName: users.name,
      requesterReportsToId: users.reportsToId,
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
      projectId: serviceRequests.projectId,
      projectName: projects.name,
      moduleId: serviceRequests.moduleId,
      moduleName: modules.name,
    };
  }

  private listQuery() {
    return this.db
      .select(this.selectListColumns())
      .from(serviceRequests)
      .leftJoin(serviceCatalog, eq(serviceRequests.catalogId, serviceCatalog.id))
      .leftJoin(users, eq(serviceRequests.requesterId, users.id))
      .leftJoin(projects, eq(serviceRequests.projectId, projects.id))
      .leftJoin(modules, eq(serviceRequests.moduleId, modules.id));
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

    // Non-EndUser must canAccess project (Agent member / Manager owner / Admin).
    const { projectId, moduleId } =
      await this.projectsService.resolveTicketProjectFields(
        user,
        dto.projectId,
        dto.moduleId,
      );

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
        projectId,
        moduleId,
      })
      .returning();

    await this.notifyApproversOfSubmission(
      created.id,
      catalog.name,
      user,
      dto.urgency,
    );

    return this.get(user, created.id);
  }

  async list(user: AuthUser) {
    const conditions: SQL[] = [];

    if (user.role === "EndUser") {
      conditions.push(eq(serviceRequests.requesterId, user.userId));
    } else if (user.role === "Manager") {
      // Phase 9: Manager team = users.reports_to_id (not project ownership).
      conditions.push(eq(users.reportsToId, user.userId));
    } else if (user.role === "Agent") {
      const scope = await this.projectAccess.ticketProjectScope(
        user,
        serviceRequests.projectId,
      );
      if (scope) conditions.push(scope);
    }
    // Admin: no filter

    const base = this.listQuery();
    const rows =
      conditions.length > 0
        ? await base
            .where(and(...conditions))
            .orderBy(desc(serviceRequests.createdAt))
        : await base.orderBy(desc(serviceRequests.createdAt));

    const redact = user.role === "EndUser";
    return {
      data: await Promise.all(rows.map((row) => this.mapRow(row, redact))),
    };
  }

  async get(user: AuthUser, id: string) {
    const [row] = await this.listQuery()
      .where(eq(serviceRequests.id, id))
      .limit(1);

    if (!row) throw new NotFoundException("Service request not found");
    if (user.role === "EndUser" && row.requesterId !== user.userId) {
      throw new ForbiddenException("Cannot view this service request");
    }
    // Phase 9: Manager team = requester.reports_to_id only (no project fallback).
    if (user.role === "Manager") {
      if (row.requesterReportsToId !== user.userId) {
        throw new ForbiddenException("Cannot view this service request");
      }
    } else if (user.role !== "EndUser") {
      await this.projectAccess.assertCanViewTicket(user, row.projectId);
    }
    return this.mapRow(row, user.role === "EndUser");
  }

  async approve(user: AuthUser, id: string) {
    const existing = await this.requirePending(id);
    const { hasManager, actorRole } = await this.assertOrgApprover(
      user,
      existing.requesterId,
      existing.status,
    );
    if (existing.status !== "Submitted" && existing.status !== "PendingApproval") {
      throw new BadRequestException(
        `Cannot approve a request in status ${existing.status}`,
      );
    }
    const nextStatus = nextApproval({
      status: existing.status,
      actorRole,
      hasManager,
    });

    const [updated] = await this.db
      .update(serviceRequests)
      .set({
        status: nextStatus,
        ...(nextStatus === "Approved"
          ? {
              approverId: user.userId,
              approvedAt: new Date(),
              rejectionReason: null,
            }
          : {
              rejectionReason: null,
            }),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(serviceRequests.id, existing.id),
          eq(serviceRequests.status, existing.status),
        ),
      )
      .returning();

    if (!updated) {
      throw new ConflictException(
        "Service request status changed; refresh and retry",
      );
    }

    if (nextStatus === "Approved") {
      await this.notifyRequesterDecision(updated.id, "Approved");
    }
    return this.get(user, updated.id);
  }

  async reject(user: AuthUser, id: string, dto: RejectServiceRequestDto) {
    const reason = sanitizePlainText(dto.reason ?? "");
    if (!reason) {
      throw new BadRequestException("Rejection reason is required");
    }
    const existing = await this.requirePending(id);
    const { hasManager, actorRole } = await this.assertOrgApprover(
      user,
      existing.requesterId,
      existing.status,
    );
    if (existing.status !== "Submitted" && existing.status !== "PendingApproval") {
      throw new BadRequestException(
        `Cannot reject a request in status ${existing.status}`,
      );
    }
    // Same actor/status gates as approve (discard next status — reject always ends Rejected).
    nextApproval({
      status: existing.status,
      actorRole,
      hasManager,
    });

    const [updated] = await this.db
      .update(serviceRequests)
      .set({
        status: "Rejected",
        approverId: user.userId,
        approvedAt: new Date(),
        rejectionReason: reason,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(serviceRequests.id, existing.id),
          eq(serviceRequests.status, existing.status),
        ),
      )
      .returning();

    if (!updated) {
      throw new ConflictException(
        "Service request status changed; refresh and retry",
      );
    }

    await this.notifyRequesterDecision(updated.id, "Rejected", reason);
    return this.get(user, updated.id);
  }

  /**
   * Phase 9: Manager must be requester.reports_to_id; Admin otherwise.
   */
  private async assertOrgApprover(
    user: AuthUser,
    requesterId: string,
    _status: string,
  ): Promise<{ hasManager: boolean; actorRole: "Manager" | "Admin" }> {
    const [requester] = await this.db
      .select({ reportsToId: users.reportsToId })
      .from(users)
      .where(eq(users.id, requesterId))
      .limit(1);
    const managerId = requester?.reportsToId ?? null;
    const hasManager = Boolean(managerId);

    if (user.role === "Manager") {
      if (!managerId || managerId !== user.userId) {
        throw new ForbiddenException(
          "Only the requester's manager can approve at this step",
        );
      }
      return { hasManager, actorRole: "Manager" };
    }
    if (user.role === "Admin") {
      return { hasManager, actorRole: "Admin" };
    }
    throw new ForbiddenException("Admin or Manager role required");
  }

  async startFulfillment(user: AuthUser, id: string) {
    try {
      assertAgentOrAdminRole(user.role);
    } catch {
      throw new ForbiddenException("Agent or Admin role required");
    }

    const existing = await this.requireExisting(id);
    await this.projectAccess.assertCanViewTicket(user, existing.projectId);

    if (!canTransitionRequestFulfillment(existing.status, "InFulfillment")) {
      throw new BadRequestException(
        `Cannot start fulfillment from status ${existing.status}. Approval is required first.`,
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
    await this.projectAccess.assertCanViewTicket(user, existing.projectId);

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

  private async notifyApproversOfSubmission(
    requestId: string,
    requestTitle: string,
    submitter: AuthUser,
    urgency: string,
  ) {
    try {
      const [requester] = await this.db
        .select({ reportsToId: users.reportsToId })
        .from(users)
        .where(eq(users.id, submitter.userId))
        .limit(1);
      const managerId = requester?.reportsToId ?? null;
      const admins = await this.db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(eq(users.role, "Admin"));
      const ids = recipientIds({
        type: "sr.submitted",
        managerId,
        adminIds: admins.map((a) => a.id),
      });
      if (ids.length === 0) return;

      const rows = await this.db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(inArray(users.id, ids));
      const byId = new Map(rows.map((r) => [r.id, r]));
      const href = `/service-requests/${requestId}`;
      await Promise.all(
        ids.map(async (uid) => {
          const row = byId.get(uid);
          if (!row?.email) return;
          await this.mail.sendRequestReviewRequest(row.email, {
            requestId,
            requestTitle,
            submitterName: submitter.name ?? submitter.email,
            urgency,
          });
          await this.notifications.record(
            uid,
            "sr.submitted",
            `Review: ${requestTitle}`,
            `${submitter.name ?? submitter.email} submitted a service request`,
            href,
          );
        }),
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
          requesterId: serviceRequests.requesterId,
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
      await this.notifications.record(
        row.requesterId,
        `sr.${decision.toLowerCase()}`,
        `${row.title} → ${decision}`,
        reason ?? `Service request ${decision.toLowerCase()}`,
        `/service-requests/${requestId}`,
      );
    } catch (err) {
      this.logger.warn(
        `Failed to enqueue request decision email for ${requestId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
