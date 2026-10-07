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
  canTransitionChange,
  CHANGE_API_TO_DB_STATUS,
  requiresAdminForChangeStatus,
} from "../common/approval-policy";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import { DRIZZLE } from "../database/database.constants";
import type { DrizzleDB } from "../database/database.module";
import { changes, users, type UserRole } from "../database/schema";
import { MailService } from "../mail/mail.service";
import { ProjectAccessService } from "../projects/project-access.service";
import { buildTicketProjectListFilter } from "../projects/project-list-scope";
import { ProjectScopeService } from "../projects/project-scope.service";
import type { CreateChangeDto, UpdateChangeDto } from "./dto/change.dto";

type DbChangeStatus =
  | "Draft"
  | "PendingApproval"
  | "Submitted"
  | "Approved"
  | "Scheduled"
  | "Implementing"
  | "Implemented"
  | "Completed"
  | "Closed"
  | "Failed"
  | "RolledBack"
  | "Cancelled";

const API_TO_DB_STATUS = CHANGE_API_TO_DB_STATUS as Record<string, DbChangeStatus>;

const DB_TO_API_STATUS: Record<string, string> = {
  Draft: "Draft",
  PendingApproval: "Submitted",
  Submitted: "Submitted",
  Approved: "Approved",
  Scheduled: "Scheduled",
  Implementing: "Implemented",
  Implemented: "Implemented",
  Completed: "Closed",
  Closed: "Closed",
  Failed: "Rolled Back",
  RolledBack: "Rolled Back",
  Cancelled: "Closed",
};

@Injectable()
export class ChangesService {
  private readonly logger = new Logger(ChangesService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly mail: MailService,
    private readonly projectScope: ProjectScopeService,
    private readonly projectAccess: ProjectAccessService,
  ) {}

  private mapRow(row: {
    id: string;
    title: string;
    description: string | null;
    type: string;
    status: string;
    scheduledStart: Date | null;
    scheduledEnd: Date | null;
    rollbackPlan: string | null;
    createdBy: string | null;
    createdByName: string | null;
    approvedBy: string | null;
    createdAt: Date;
  }) {
    return {
      id: row.id,
      title: row.title,
      description: row.description ?? "",
      type: row.type,
      status: DB_TO_API_STATUS[row.status] ?? row.status,
      scheduledStart: row.scheduledStart?.toISOString() ?? "",
      scheduledEnd: row.scheduledEnd?.toISOString() ?? "",
      rollbackPlan: row.rollbackPlan ?? "",
      createdById: row.createdBy ?? "",
      createdByName: row.createdByName ?? "Unknown",
      approvedById: row.approvedBy ?? undefined,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async create(user: AuthUser, dto: CreateChangeDto) {
    const start = new Date(dto.scheduledStart);
    const end = new Date(dto.scheduledEnd);
    if (!(start < end)) {
      throw new BadRequestException("scheduledEnd must be after scheduledStart");
    }

    const needsRollback = dto.type === "Normal" || dto.type === "Emergency";
    const rollbackPlan = (dto.rollbackPlan ?? "").trim();
    if (needsRollback && !rollbackPlan) {
      throw new BadRequestException(
        "Rollback plan is required for Normal and Emergency changes",
      );
    }

    const scope = await this.projectScope.resolveTicketProjectScope({
      projectId: dto.projectId,
      moduleId: dto.moduleId,
    });

    const [created] = await this.db
      .insert(changes)
      .values({
        title: dto.title,
        description: dto.description,
        type: dto.type,
        scheduledStart: start,
        scheduledEnd: end,
        rollbackPlan,
        status: "Submitted",
        createdBy: user.userId,
        projectId: scope.projectId,
        moduleId: scope.moduleId,
      })
      .returning();

    await this.notifyAdminsOfSubmission(created.id, user);
    return this.get(user, created.id);
  }

  private async notifyAdminsOfSubmission(changeId: string, submitter: AuthUser) {
    try {
      const [change] = await this.db
        .select({
          title: changes.title,
          type: changes.type,
        })
        .from(changes)
        .where(eq(changes.id, changeId))
        .limit(1);
      if (!change) return;

      const admins = await this.db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.role, "Admin"));

      await Promise.all(
        admins.map((admin) =>
          this.mail.sendChangeReviewRequest(admin.email, {
            changeId,
            changeTitle: change.title,
            submitterName: submitter.name ?? submitter.email,
            changeType: change.type,
          }),
        ),
      );
    } catch (err) {
      this.logger.warn(
        `Failed to enqueue change review emails for ${changeId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  async list(
    user: AuthUser,
    filters: { type?: string; status?: string },
  ) {
    const conditions = [];
    if (filters.type) {
      conditions.push(eq(changes.type, filters.type as never));
    }
    if (filters.status) {
      const dbStatus = API_TO_DB_STATUS[filters.status] ?? filters.status;
      conditions.push(eq(changes.status, dbStatus as never));
    }

    const accessibleIds =
      user.role === "Admin"
        ? null
        : await this.projectAccess.listAccessibleProjectIds(user);
    const projectFilter = buildTicketProjectListFilter(
      changes.projectId,
      user.role,
      accessibleIds,
    );
    if (projectFilter) conditions.push(projectFilter);

    const rows = conditions.length
      ? await this.db
          .select({
            id: changes.id,
            title: changes.title,
            description: changes.description,
            type: changes.type,
            status: changes.status,
            scheduledStart: changes.scheduledStart,
            scheduledEnd: changes.scheduledEnd,
            rollbackPlan: changes.rollbackPlan,
            createdBy: changes.createdBy,
            createdByName: users.name,
            approvedBy: changes.approvedBy,
            createdAt: changes.createdAt,
          })
          .from(changes)
          .leftJoin(users, eq(changes.createdBy, users.id))
          .where(and(...conditions))
          .orderBy(desc(changes.createdAt))
      : await this.db
          .select({
            id: changes.id,
            title: changes.title,
            description: changes.description,
            type: changes.type,
            status: changes.status,
            scheduledStart: changes.scheduledStart,
            scheduledEnd: changes.scheduledEnd,
            rollbackPlan: changes.rollbackPlan,
            createdBy: changes.createdBy,
            createdByName: users.name,
            approvedBy: changes.approvedBy,
            createdAt: changes.createdAt,
          })
          .from(changes)
          .leftJoin(users, eq(changes.createdBy, users.id))
          .orderBy(desc(changes.createdAt));

    return { data: rows.map((row) => this.mapRow(row)) };
  }

  async get(user: AuthUser, id: string) {
    const [row] = await this.db
      .select({
        id: changes.id,
        title: changes.title,
        description: changes.description,
        type: changes.type,
        status: changes.status,
        scheduledStart: changes.scheduledStart,
        scheduledEnd: changes.scheduledEnd,
        rollbackPlan: changes.rollbackPlan,
        createdBy: changes.createdBy,
        createdByName: users.name,
        approvedBy: changes.approvedBy,
        createdAt: changes.createdAt,
        projectId: changes.projectId,
      })
      .from(changes)
      .leftJoin(users, eq(changes.createdBy, users.id))
      .where(eq(changes.id, id))
      .limit(1);

    if (!row) throw new NotFoundException("Change not found");
    await this.assertCanAccessTicket(user, row.projectId);
    return this.mapRow(row);
  }

  async approve(user: AuthUser, id: string) {
    const [existing] = await this.db
      .select()
      .from(changes)
      .where(eq(changes.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException("Change not found");
    await this.projectAccess.assertCanApprove(user, existing.projectId);

    const apiStatus = DB_TO_API_STATUS[existing.status] ?? existing.status;
    if (apiStatus !== "Submitted" && apiStatus !== "Draft") {
      throw new BadRequestException(
        `Cannot approve a change in status ${apiStatus}`,
      );
    }

    await this.db
      .update(changes)
      .set({
        status: "Approved",
        approvedBy: user.userId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(changes.id, id));

    await this.notifyCreator(existing.createdBy, {
      entityId: existing.id,
      entityTitle: existing.title,
      outcome: "approved",
    });

    return this.get(user, id);
  }

  private async notifyCreator(
    createdBy: string | null,
    info: {
      entityId: string;
      entityTitle: string;
      outcome: "approved" | "rejected";
      reason?: string;
    },
  ) {
    if (!createdBy) return;
    try {
      const [creator] = await this.db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, createdBy))
        .limit(1);
      if (!creator?.email) return;
      await this.mail.sendApprovalOutcome(creator.email, {
        entityType: "change",
        entityId: info.entityId,
        entityTitle: info.entityTitle,
        outcome: info.outcome,
        reason: info.reason,
      });
    } catch (err) {
      this.logger.warn(
        `approval mail enqueue failed change=${info.entityId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  async update(user: AuthUser, id: string, dto: UpdateChangeDto) {
    const [existing] = await this.db
      .select()
      .from(changes)
      .where(eq(changes.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException("Change not found");
    await this.assertCanAccessTicket(user, existing.projectId);

    const patch: Partial<typeof changes.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.type !== undefined) patch.type = dto.type;
    if (dto.rollbackPlan !== undefined) patch.rollbackPlan = dto.rollbackPlan;
    if (dto.scheduledStart !== undefined) {
      patch.scheduledStart = new Date(dto.scheduledStart);
    }
    if (dto.scheduledEnd !== undefined) {
      patch.scheduledEnd = new Date(dto.scheduledEnd);
    }

    if (dto.status !== undefined) {
      const currentApi = DB_TO_API_STATUS[existing.status] ?? existing.status;
      if (
        !canTransitionChange(existing.status, dto.status) &&
        !canTransitionChange(currentApi, dto.status)
      ) {
        throw new BadRequestException(
          `Invalid transition from ${currentApi} to ${dto.status}`,
        );
      }
      if (requiresAdminForChangeStatus(dto.status)) {
        // Approve + reject (Rolled Back) — Admin any; Manager own-project only.
        if (dto.status === "Approved" || dto.status === "Rolled Back") {
          await this.projectAccess.assertCanApprove(user, existing.projectId);
        } else if ((user.role as UserRole) !== "Admin") {
          throw new ForbiddenException(
            `Admin role required to set change status to ${dto.status}`,
          );
        }
      }
      const dbStatus = API_TO_DB_STATUS[dto.status];
      if (!dbStatus) {
        throw new BadRequestException(`Unknown status ${dto.status}`);
      }
      patch.status = dbStatus;
      if (dto.status === "Approved") {
        patch.approvedBy = user.userId;
        patch.approvedAt = new Date();
      }
    }

    const start = patch.scheduledStart ?? existing.scheduledStart;
    const end = patch.scheduledEnd ?? existing.scheduledEnd;
    if (start && end && !(start < end)) {
      throw new BadRequestException("scheduledEnd must be after scheduledStart");
    }

    if (dto.projectId !== undefined || dto.moduleId !== undefined) {
      const scope = await this.projectScope.resolveTicketProjectScope({
        projectId: dto.projectId,
        moduleId: dto.moduleId,
        existingProjectId: existing.projectId,
        existingModuleId: existing.moduleId,
      });
      patch.projectId = scope.projectId;
      patch.moduleId = scope.moduleId;
    }

    await this.db.update(changes).set(patch).where(eq(changes.id, id));

    if (dto.status === "Approved") {
      await this.notifyCreator(existing.createdBy, {
        entityId: existing.id,
        entityTitle: patch.title ?? existing.title,
        outcome: "approved",
      });
    } else if (dto.status === "Rolled Back") {
      await this.notifyCreator(existing.createdBy, {
        entityId: existing.id,
        entityTitle: patch.title ?? existing.title,
        outcome: "rejected",
        reason: "Change rolled back",
      });
    }

    return this.get(user, id);
  }

  private async assertCanAccessTicket(
    user: AuthUser,
    projectId: string | null,
  ) {
    if (user.role === "Admin") return;
    if (user.role === "Agent" && (projectId == null || projectId === "")) {
      return;
    }
    if (!(await this.projectAccess.canAccess(user, projectId))) {
      throw new ForbiddenException("Cannot access this change");
    }
  }
}
