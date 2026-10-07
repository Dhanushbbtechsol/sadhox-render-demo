import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { and, desc, eq, SQL } from "drizzle-orm";
import {
  assertAgentOrAdminRole,
  canTransitionRequestFulfillment,
  isPendingServiceRequestStatus,
} from "../common/approval-policy";
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
    private readonly projectAccess: ProjectAccessService,
    private readonly projectsService: ProjectsService,
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
    projectId: string | null;
    projectName: string | null;
    moduleId: string | null;
    moduleName: string | null;
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
      projectId,
    );

    return this.get(user, created.id);
  }

  async list(user: AuthUser) {
    const conditions: SQL[] = [];

    if (user.role === "EndUser") {
      conditions.push(eq(serviceRequests.requesterId, user.userId));
    } else if (user.role === "Manager") {
      const scope = await this.projectAccess.ticketProjectScope(
        user,
        serviceRequests.projectId,
      );
      if (scope) conditions.push(scope);
    } else if (user.role === "Agent") {
      const scope = await this.projectAccess.ticketProjectScope(
        user,
        serviceRequests.projectId,
      );
      if (scope) conditions.push(scope);
    }
    // Admin: no project filter; Manager also sees Approvals via scoped list

    const base = this.listQuery();
    const rows =
      conditions.length > 0
        ? await base
            .where(and(...conditions))
            .orderBy(desc(serviceRequests.createdAt))
        : await base.orderBy(desc(serviceRequests.createdAt));

    return {
      data: await Promise.all(rows.map((row) => this.mapRow(row))),
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
    if (user.role !== "EndUser") {
      await this.projectAccess.assertCanViewTicket(user, row.projectId);
    }
    return this.mapRow(row);
  }

  async approve(user: AuthUser, id: string) {
    const existing = await this.requirePending(id);
    await this.projectAccess.assertCanApprove(user, existing.projectId);

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
    const reason = sanitizePlainText(dto.reason ?? "");
    if (!reason) {
      throw new BadRequestException("Rejection reason is required");
    }
    const existing = await this.requirePending(id);
    await this.projectAccess.assertCanApprove(user, existing.projectId);

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
    projectId: string | null,
  ) {
    try {
      const recipients: { email: string }[] = [];

      const admins = await this.db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.role, "Admin"));
      recipients.push(...admins);

      if (projectId) {
        const managers = await this.db
          .select({ email: users.email })
          .from(projects)
          .innerJoin(users, eq(projects.managerId, users.id))
          .where(eq(projects.id, projectId));
        recipients.push(...managers);
      }

      const unique = [...new Map(recipients.map((r) => [r.email, r])).values()];

      await Promise.all(
        unique.map((r) =>
          this.mail.sendRequestReviewRequest(r.email, {
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
