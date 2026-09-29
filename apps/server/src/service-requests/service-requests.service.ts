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
import type {
  CreateServiceRequestDto,
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

    const [requester] = await this.db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, user.userId))
      .limit(1);

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
    });
  }

  async list(user: AuthUser) {
    const base = this.db
      .select({
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
      })
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
      .select({
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
      })
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

    await this.notifyRequester(existing.requesterId, {
      entityId: updated.id,
      entityTitle: updated.title,
      outcome: "approved",
    });

    return this.get(user, updated.id);
  }

  async reject(user: AuthUser, id: string, dto: RejectServiceRequestDto) {
    try {
      assertAdminRole(user.role);
    } catch {
      throw new ForbiddenException("Admin role required");
    }
    if (!dto.reason?.trim()) {
      throw new BadRequestException("Rejection reason is required");
    }
    const existing = await this.requirePending(id);

    const [updated] = await this.db
      .update(serviceRequests)
      .set({
        status: "Rejected",
        approverId: user.userId,
        approvedAt: new Date(),
        rejectionReason: dto.reason.trim(),
        updatedAt: new Date(),
      })
      .where(eq(serviceRequests.id, existing.id))
      .returning();

    await this.notifyRequester(existing.requesterId, {
      entityId: updated.id,
      entityTitle: updated.title,
      outcome: "rejected",
      reason: dto.reason.trim(),
    });

    return this.get(user, updated.id);
  }

  private async notifyRequester(
    requesterId: string,
    info: {
      entityId: string;
      entityTitle: string;
      outcome: "approved" | "rejected";
      reason?: string;
    },
  ) {
    try {
      const [requester] = await this.db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, requesterId))
        .limit(1);
      if (!requester?.email) return;
      await this.mail.sendApprovalOutcome(requester.email, {
        entityType: "service-request",
        entityId: info.entityId,
        entityTitle: info.entityTitle,
        outcome: info.outcome,
        reason: info.reason,
      });
    } catch (err) {
      this.logger.warn(
        `approval mail enqueue failed service-request=${info.entityId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  private async requirePending(id: string) {
    const [existing] = await this.db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException("Service request not found");
    if (!isPendingServiceRequestStatus(existing.status)) {
      throw new BadRequestException(
        `Cannot approve/reject a request in status ${existing.status}`,
      );
    }
    return existing;
  }
}
