import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { and, desc, eq, SQL } from "drizzle-orm";
import {
  canTransitionChange,
  CHANGE_API_TO_DB_STATUS,
  requiresAdminForChangeStatus,
} from "../common/approval-policy";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import { sanitizePlainText } from "../common/sanitize-plain-text";
import { DRIZZLE } from "../database/database.constants";
import type { DrizzleDB } from "../database/database.module";
import {
  changes,
  modules,
  projects,
  users,
  type UserRole,
} from "../database/schema";
import { MailService } from "../mail/mail.service";
import { NotificationService } from "../notifications/notification.service";
import { ProjectAccessService } from "../projects/project-access.service";
import { ProjectsService } from "../projects/projects.service";
import { claimReference } from "../incidents/reference";
import type {
  CreateChangeDto,
  RejectChangeDto,
  UpdateChangeDto,
} from "./dto/change.dto";

/** Post-approval lifecycle actions are disabled — request + Admin approve/reject only. */
const CHANGE_ACTION_STATUSES = new Set([
  "Scheduled",
  "Implemented",
  "Closed",
]);

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
  PendingApproval: "PendingApproval",
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
    private readonly notifications: NotificationService,
    private readonly projectAccess: ProjectAccessService,
    private readonly projectsService: ProjectsService,
  ) {}

  private mapRow(row: {
    id: string;
    referenceCode: string;
    title: string;
    description: string | null;
    type: string;
    status: string;
    scheduledStart: Date | null;
    scheduledEnd: Date | null;
    rollbackPlan: string | null;
    createdBy: string | null;
    createdByName: string | null;
    creatorReportsToId: string | null;
    approvedBy: string | null;
    createdAt: Date;
    projectId: string | null;
    projectName: string | null;
    moduleId: string | null;
    moduleName: string | null;
  }) {
    return {
      id: row.id,
      referenceCode: row.referenceCode,
      title: row.title,
      description: row.description ?? "",
      type: row.type,
      status: DB_TO_API_STATUS[row.status] ?? row.status,
      scheduledStart: row.scheduledStart?.toISOString() ?? "",
      scheduledEnd: row.scheduledEnd?.toISOString() ?? "",
      rollbackPlan: row.rollbackPlan ?? "",
      createdById: row.createdBy ?? "",
      createdByName: row.createdByName ?? "Unknown",
      creatorReportsToId: row.creatorReportsToId ?? null,
      approvedById: row.approvedBy ?? undefined,
      createdAt: row.createdAt.toISOString(),
      projectId: row.projectId ?? null,
      projectName: row.projectName ?? null,
      moduleId: row.moduleId ?? null,
      moduleName: row.moduleName ?? null,
    };
  }

  private selectColumns() {
    return {
      id: changes.id,
      referenceCode: changes.referenceCode,
      title: changes.title,
      description: changes.description,
      type: changes.type,
      status: changes.status,
      scheduledStart: changes.scheduledStart,
      scheduledEnd: changes.scheduledEnd,
      rollbackPlan: changes.rollbackPlan,
      createdBy: changes.createdBy,
      createdByName: users.name,
      creatorReportsToId: users.reportsToId,
      approvedBy: changes.approvedBy,
      createdAt: changes.createdAt,
      projectId: changes.projectId,
      projectName: projects.name,
      moduleId: changes.moduleId,
      moduleName: modules.name,
    };
  }

  private baseQuery() {
    return this.db
      .select(this.selectColumns())
      .from(changes)
      .leftJoin(users, eq(changes.createdBy, users.id))
      .leftJoin(projects, eq(changes.projectId, projects.id))
      .leftJoin(modules, eq(changes.moduleId, modules.id));
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

    // Agent/Admin must canAccess project; EndUser existence-check only.
    const { projectId, moduleId } =
      await this.projectsService.resolveTicketProjectFields(
        user,
        dto.projectId,
        dto.moduleId,
      );

    // Project is required so the owning Manager can see and approve the request.
    if (!projectId) {
      throw new BadRequestException(
        "A project is required for change requests so the project Manager can review them",
      );
    }

    const [created] = await this.db.transaction(async (tx) => {
      const referenceCode = await claimReference(tx, "CHG");
      return tx
        .insert(changes)
        .values({
          referenceCode,
          title: dto.title,
          description: dto.description,
          type: dto.type,
          scheduledStart: start,
          scheduledEnd: end,
          rollbackPlan,
          status: "Submitted",
          createdBy: user.userId,
          projectId,
          moduleId,
        })
        .returning();
    });

    await this.notifyApproversOfSubmission(created.id, user, projectId);
    return this.get(user, created.id);
  }

  private async notifyApproversOfSubmission(
    changeId: string,
    submitter: AuthUser,
    projectId: string | null,
  ) {
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

      // Notify Admins always; also project Manager so they can approve if Admin does not.
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
          this.mail.sendChangeReviewRequest(r.email, {
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
    const conditions: SQL[] = [];
    if (filters.type) {
      conditions.push(eq(changes.type, filters.type as never));
    }
    if (filters.status) {
      const dbStatus = API_TO_DB_STATUS[filters.status] ?? filters.status;
      conditions.push(eq(changes.status, dbStatus as never));
    }

    if (user.role === "EndUser") {
      conditions.push(eq(changes.createdBy, user.userId));
    } else if (user.role === "Manager" || user.role === "Agent") {
      const scope = await this.projectAccess.ticketProjectScope(
        user,
        changes.projectId,
      );
      if (scope) conditions.push(scope);
    }

    const rows =
      conditions.length > 0
        ? await this.baseQuery()
            .where(and(...conditions))
            .orderBy(desc(changes.createdAt))
        : await this.baseQuery().orderBy(desc(changes.createdAt));

    return { data: rows.map((row) => this.mapRow(row)) };
  }

  async get(user: AuthUser, id: string) {
    const [row] = await this.baseQuery().where(eq(changes.id, id)).limit(1);

    if (!row) throw new NotFoundException("Change not found");
    if (user.role === "EndUser") {
      if (row.createdBy !== user.userId) {
        throw new ForbiddenException("Cannot view this change");
      }
      return this.mapRow(row);
    }
    await this.projectAccess.assertCanViewTicket(user, row.projectId);
    return this.mapRow(row);
  }

  async approve(user: AuthUser, id: string) {
    const [existing] = await this.db
      .select()
      .from(changes)
      .where(eq(changes.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException("Change not found");

    // Admin any; Manager own-project only (fallback if Admin has not acted).
    await this.projectAccess.assertCanApprove(user, existing.projectId);

    const apiStatus = DB_TO_API_STATUS[existing.status] ?? existing.status;
    this.assertDecisionStatus(
      user.role as UserRole,
      apiStatus,
      "Approved",
    );

    const [updated] = await this.db
      .update(changes)
      .set({
        status: "Approved",
        approvedBy: user.userId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(changes.id, id),
          eq(changes.status, existing.status as DbChangeStatus),
        ),
      )
      .returning();

    if (!updated) {
      throw new ConflictException("Change status changed; refresh and retry");
    }

    await this.notifyCreator(existing.createdBy, {
      entityId: existing.id,
      entityTitle: existing.title,
      outcome: "approved",
    });

    return this.get(user, id);
  }

  async reject(user: AuthUser, id: string, dto: RejectChangeDto) {
    const reason = sanitizePlainText(dto.reason ?? "");
    if (!reason) {
      throw new BadRequestException("Rejection reason is required");
    }

    const [existing] = await this.db
      .select()
      .from(changes)
      .where(eq(changes.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException("Change not found");

    await this.projectAccess.assertCanApprove(user, existing.projectId);

    const apiStatus = DB_TO_API_STATUS[existing.status] ?? existing.status;
    this.assertDecisionStatus(
      user.role as UserRole,
      apiStatus,
      "Rolled Back",
    );

    const [updated] = await this.db
      .update(changes)
      .set({
        status: "RolledBack",
        approvedBy: user.userId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(changes.id, id),
          eq(changes.status, existing.status as DbChangeStatus),
        ),
      )
      .returning();

    if (!updated) {
      throw new ConflictException("Change status changed; refresh and retry");
    }

    await this.notifyCreator(existing.createdBy, {
      entityId: existing.id,
      entityTitle: existing.title,
      outcome: "rejected",
      reason,
    });

    return this.get(user, id);
  }

  /** Admin or Manager may final-approve/reject waiting changes (no PendingApproval hop). */
  private assertDecisionStatus(
    role: UserRole,
    apiStatus: string,
    nextStatus: "Approved" | "Rolled Back",
  ): void {
    if (role !== "Admin" && role !== "Manager") {
      throw new ForbiddenException("Admin or Manager role required");
    }
    if (
      apiStatus === "PendingApproval" ||
      apiStatus === "Submitted" ||
      apiStatus === "Draft"
    ) {
      return;
    }
    throw new BadRequestException(
      `Cannot set ${nextStatus} from status ${apiStatus}`,
    );
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
      await this.notifications.record(
        createdBy,
        `change.${info.outcome}`,
        `${info.entityTitle} → ${info.outcome}`,
        info.reason ?? `Change ${info.outcome}`,
        `/changes/${info.entityId}`,
      );
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
    await this.projectAccess.assertCanViewTicket(user, existing.projectId);

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
      if (CHANGE_ACTION_STATUSES.has(dto.status)) {
        throw new BadRequestException(
          "Change actions are disabled; only Admin or Manager approval/rejection is allowed",
        );
      }
      if (dto.status === "PendingApproval") {
        throw new BadRequestException(
          "PendingApproval is not used for changes; Admin or Manager approves Submitted directly",
        );
      }

      const currentApi = DB_TO_API_STATUS[existing.status] ?? existing.status;
      if (
        !canTransitionChange(existing.status, dto.status) &&
        !canTransitionChange(currentApi, dto.status)
      ) {
        throw new BadRequestException(
          `Invalid transition from ${currentApi} to ${dto.status}`,
        );
      }
      if (dto.status === "Approved" || dto.status === "Rolled Back") {
        await this.projectAccess.assertCanApprove(user, existing.projectId);
        this.assertDecisionStatus(
          user.role as UserRole,
          currentApi,
          dto.status,
        );
      } else if (requiresAdminForChangeStatus(dto.status)) {
        if ((user.role as UserRole) !== "Admin") {
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
      if (dto.status === "Approved" || dto.status === "Rolled Back") {
        patch.approvedBy = user.userId;
        patch.approvedAt = new Date();
      }
    }

    const start = patch.scheduledStart ?? existing.scheduledStart;
    const end = patch.scheduledEnd ?? existing.scheduledEnd;
    if (start && end && !(start < end)) {
      throw new BadRequestException("scheduledEnd must be after scheduledStart");
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
}
