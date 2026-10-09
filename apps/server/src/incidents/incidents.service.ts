import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, asc, count, desc, eq, isNull, SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { AssignmentService } from "../assignment/assignment.service";
import { AssetsService } from "../assets/assets.service";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import { sanitizePlainText } from "../common/sanitize-plain-text";
import { DRIZZLE } from "../database/database.constants";
import type { DrizzleDB } from "../database/database.module";
import {
  comments,
  incidents,
  slaRules,
  users,
  type IncidentStatus,
  type Priority,
} from "../database/schema";
import { EventsService } from "../events/events.service";
import { MailService } from "../mail/mail.service";
import { NotificationService } from "../notifications/notification.service";
import { recipientIds } from "../notifications/recipients";
import { ProjectAccessService } from "../projects/project-access.service";
import { ProjectsService } from "../projects/projects.service";
import type {
  AssignIncidentDto,
  CreateCommentDto,
  CreateIncidentDto,
  UpdateIncidentDto,
} from "./dto/incident.dto";
import type { ListIncidentsQueryDto } from "./dto/list-incidents-query.dto";
import {
  assertCanTransitionIncident,
  requiresResolutionNotes,
} from "./incident-transitions";
import { canAssignIncident, canMutateIncident } from "./incident-rbac";
import {
  invalidCategorySubcategoryMessage,
  isValidIncidentCategorySubcategory,
} from "./incident-category-map";
import { PriorityCalculationService } from "./priority-calculation.service";

type UserSnippet = {
  id: string;
  name: string;
  email: string;
};

export type IncidentListItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  impact: string;
  urgency: string;
  priority: Priority;
  status: IncidentStatus;
  assignedTo: string | null;
  assigneeName: string | null;
  reporterId: string;
  reporterName: string | null;
  projectId: string | null;
  moduleId: string | null;
  slaDueAt: string | null;
  slaBreached: boolean;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type IncidentDetail = IncidentListItem & {
  reporter: UserSnippet | null;
  assignee: UserSnippet | null;
  slaTargetMinutes: number | null;
};

export type CommentView = {
  id: string;
  ticketId: string;
  ticketType: "incident";
  authorId: string;
  authorName: string | null;
  content: string;
  createdAt: string;
};

@Injectable()
export class IncidentsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly priorityCalc: PriorityCalculationService,
    private readonly events: EventsService,
    private readonly assignment: AssignmentService,
    private readonly mail: MailService,
    private readonly notifications: NotificationService,
    private readonly assets: AssetsService,
    private readonly projectAccess: ProjectAccessService,
    private readonly projectsService: ProjectsService,
  ) {}

  async list(user: AuthUser, query: ListIncidentsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const filters = await this.buildFilters(user, query);

    const [totalRow] = await this.db
      .select({ total: count() })
      .from(incidents)
      .where(filters);

    const total = Number(totalRow?.total ?? 0);
    const sortColumn = this.sortColumn(query.sortBy);
    const order =
      query.sortDir === "asc" ? asc(sortColumn) : desc(sortColumn);

    const reporter = alias(users, "reporter");
    const assignee = alias(users, "assignee");

    const rows = await this.db
      .select({
        incident: incidents,
        reporterName: reporter.name,
        assigneeName: assignee.name,
      })
      .from(incidents)
      .leftJoin(reporter, eq(incidents.reporterId, reporter.id))
      .leftJoin(assignee, eq(incidents.assignedTo, assignee.id))
      .where(filters)
      .orderBy(order)
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      data: rows.map((row) =>
        this.toListItem(row.incident, row.reporterName, row.assigneeName),
      ),
      meta: {
        page,
        pageSize,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
      },
    };
  }

  async get(user: AuthUser, id: string): Promise<IncidentDetail> {
    const row = await this.loadIncidentRow(id);
    if (!row) throw new NotFoundException("Incident not found");
    await this.assertCanRead(
      user,
      row.incident.reporterId,
      row.incident.projectId,
    );

    const [sla] = await this.db
      .select({ resolveMinutes: slaRules.resolveMinutes })
      .from(slaRules)
      .where(eq(slaRules.priority, row.incident.priority))
      .limit(1);

    return {
      ...this.toListItem(
        row.incident,
        row.reporter?.name ?? null,
        row.assignee?.name ?? null,
      ),
      reporter: row.reporter,
      assignee: row.assignee,
      slaTargetMinutes: sla?.resolveMinutes ?? null,
    };
  }

  /**
   * Linked assets for an incident — never includes purchaseCost (financial).
   * Callers must be Admin/Agent (controller Roles); still enforces incident ACL.
   */
  async listLinkedAssets(user: AuthUser, incidentId: string) {
    const row = await this.loadIncidentRow(incidentId);
    if (!row) throw new NotFoundException("Incident not found");
    await this.assertCanRead(
      user,
      row.incident.reporterId,
      row.incident.projectId,
    );
    return this.assets.listLinkedPublic(incidentId);
  }

  async create(user: AuthUser, dto: CreateIncidentDto) {
    const title = sanitizePlainText(dto.title, 255);
    const description = sanitizePlainText(dto.description, 10_000);
    if (!title || title.length < 5) {
      throw new BadRequestException("Title is required");
    }
    if (!description || description.length < 10) {
      throw new BadRequestException("Description is required");
    }
    // Category/subcategory: exact map match (DTO already validated); not free text.
    if (!isValidIncidentCategorySubcategory(dto.category, dto.subcategory)) {
      throw new BadRequestException(
        invalidCategorySubcategoryMessage(dto.category, dto.subcategory),
      );
    }

    const priority = this.priorityCalc.calculate(dto.impact, dto.urgency);
    const now = new Date();
    const resolveMinutes = await this.lookupResolveMinutes(priority);
    const slaDueAt = this.priorityCalc.resolveDueAt(
      priority,
      now,
      resolveMinutes,
    );

    const scope = await this.projectsService.resolveTicketProjectFields(
      user,
      dto.projectId,
      dto.moduleId,
    );

    let assignee: { id: string; email: string; name: string } | null = null;
    if (dto.assignedTo) {
      if (!canAssignIncident(user.role)) {
        throw new ForbiddenException("End users cannot assign incidents");
      }
      assignee = await this.assertAssigneeInPool(
        dto.assignedTo,
        scope.projectId,
      );
    }

    const [created] = await this.db
      .insert(incidents)
      .values({
        title,
        description,
        category: dto.category,
        subcategory: dto.subcategory,
        impact: dto.impact,
        urgency: dto.urgency,
        priority,
        status: assignee ? "Assigned" : "New",
        reporterId: user.userId,
        assignedTo: assignee?.id ?? null,
        projectId: scope.projectId,
        moduleId: scope.moduleId,
        slaDueAt,
        slaBreached: false,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (assignee) {
      try {
        await this.mail.sendTicketAssigned(assignee.email, {
          ticketId: created!.id,
          ticketTitle: title,
          assigneeName: assignee.name,
        });
        await this.notifyReporterStatus(
          created!.id,
          title,
          user.userId,
          "New",
          "Assigned",
          user.name ?? user.email,
          assignee.id,
        );
      } catch {
        // Assignment succeeded; email is best-effort (same as assign()).
      }
    }

    if (priority === "P1") {
      await this.notifyP1Created(created!.id, title);
    }

    return this.get(user, created!.id);
  }

  async assign(user: AuthUser, id: string, dto: AssignIncidentDto) {
    if (!canAssignIncident(user.role)) {
      throw new ForbiddenException("End users cannot assign incidents");
    }

    const existing = await this.loadIncidentRow(id);
    if (!existing) throw new NotFoundException("Incident not found");
    await this.projectAccess.assertCanAccessTicketProject(
      user,
      existing.incident.projectId,
    );

    const current = existing.incident.status;
    if (current === "Resolved" || current === "Closed") {
      throw new BadRequestException(
        `Cannot assign an incident in status ${current}`,
      );
    }

    let agentId = dto.agentId;
    let agentEmail: string;
    let agentName: string;

    if (agentId) {
      const agent = await this.assertAssigneeInPool(
        agentId,
        existing.incident.projectId,
      );
      agentEmail = agent.email;
      agentName = agent.name;
    } else {
      const next = await this.assignment.assignNextAgent(
        id,
        existing.incident.category,
      );
      agentId = next.id;
      agentEmail = next.email;
      agentName = next.name;
    }

    const now = new Date();
    const nextStatus: IncidentStatus =
      current === "New" ? "Assigned" : current;

    if (nextStatus !== current) {
      try {
        assertCanTransitionIncident(current, nextStatus);
      } catch (err) {
        throw new BadRequestException(
          err instanceof Error ? err.message : "Invalid status transition",
        );
      }
    }

    const [updated] = await this.db
      .update(incidents)
      .set({
        assignedTo: agentId,
        status: nextStatus,
        updatedAt: now,
      })
      .where(eq(incidents.id, id))
      .returning();

    if (!updated) throw new NotFoundException("Incident not found");

    try {
      await this.mail.sendTicketAssigned(agentEmail, {
        ticketId: id,
        ticketTitle: existing.incident.title,
        assigneeName: agentName,
      });
      await this.notifyReporterStatus(
        id,
        existing.incident.title,
        existing.incident.reporterId,
        current,
        nextStatus,
        user.name ?? user.email,
        agentId,
      );
    } catch {
      // Assignment succeeded; mail enqueue failures are logged by MailService.
    }

    const detail = await this.get(user, id);
    this.events.emitTicketUpdated(id, detail);
    return detail;
  }

  async update(user: AuthUser, id: string, dto: UpdateIncidentDto) {
    if (!canMutateIncident(user.role)) {
      throw new ForbiddenException("End users cannot update incidents");
    }

    const existing = await this.loadIncidentRow(id);
    if (!existing) throw new NotFoundException("Incident not found");
    await this.projectAccess.assertCanAccessTicketProject(
      user,
      existing.incident.projectId,
    );

    let nextProjectId = existing.incident.projectId;
    let nextModuleId = existing.incident.moduleId;
    if (dto.projectId !== undefined || dto.moduleId !== undefined) {
      const scope = await this.projectsService.resolveTicketProjectFields(
        user,
        dto.projectId !== undefined
          ? dto.projectId
          : existing.incident.projectId,
        dto.moduleId !== undefined
          ? dto.moduleId
          : existing.incident.moduleId,
      );
      nextProjectId = scope.projectId;
      nextModuleId = scope.moduleId;
    }

    const nextCategory =
      dto.category !== undefined ? dto.category : existing.incident.category;
    const nextSubcategory =
      dto.subcategory !== undefined
        ? dto.subcategory
        : existing.incident.subcategory;
    const categoryChanged =
      dto.category !== undefined &&
      dto.category !== existing.incident.category;
    const subcategoryChanged =
      dto.subcategory !== undefined &&
      dto.subcategory !== existing.incident.subcategory;
    if (categoryChanged || subcategoryChanged) {
      if (
        !isValidIncidentCategorySubcategory(nextCategory, nextSubcategory)
      ) {
        if (categoryChanged && !subcategoryChanged) {
          throw new BadRequestException(
            `Category "${nextCategory}" is not compatible with the current subcategory "${nextSubcategory}". Provide a new subcategory that belongs to "${nextCategory}".`,
          );
        }
        throw new BadRequestException(
          invalidCategorySubcategoryMessage(nextCategory, nextSubcategory),
        );
      }
    }

    const impact = dto.impact ?? existing.incident.impact;
    const urgency = dto.urgency ?? existing.incident.urgency;
    const recalculate =
      dto.impact !== undefined || dto.urgency !== undefined;
    const priority = recalculate
      ? this.priorityCalc.calculate(impact, urgency)
      : existing.incident.priority;

    const now = new Date();
    let slaDueAt = existing.incident.slaDueAt;
    if (recalculate) {
      const resolveMinutes = await this.lookupResolveMinutes(priority);
      slaDueAt = this.priorityCalc.resolveDueAt(
        priority,
        existing.incident.createdAt,
        resolveMinutes,
      );
    }

    const fromStatus = existing.incident.status;
    const toStatus = dto.status ?? fromStatus;

    if (dto.status !== undefined && dto.status !== fromStatus) {
      try {
        assertCanTransitionIncident(fromStatus, dto.status);
      } catch (err) {
        throw new BadRequestException(
          err instanceof Error ? err.message : "Invalid status transition",
        );
      }
    }

    let resolutionNotes =
      dto.resolutionNotes !== undefined
        ? sanitizePlainText(dto.resolutionNotes)
        : existing.incident.resolutionNotes;
    if (requiresResolutionNotes(fromStatus, toStatus)) {
      const notes =
        dto.resolutionNotes !== undefined
          ? sanitizePlainText(dto.resolutionNotes)
          : "";
      if (!notes) {
        throw new BadRequestException(
          "Resolution notes are required when resolving an incident",
        );
      }
      resolutionNotes = notes;
    }

    let resolvedAt = existing.incident.resolvedAt;
    let closedAt = existing.incident.closedAt;
    if (toStatus === "Resolved" && fromStatus !== "Resolved") {
      resolvedAt = now;
    }
    if (toStatus === "Closed" && fromStatus !== "Closed") {
      closedAt = now;
    }
    if (toStatus !== "Resolved" && toStatus !== "Closed") {
      resolvedAt = null;
      closedAt = null;
    }

    const nextAssignee =
      dto.assignedTo !== undefined
        ? dto.assignedTo
        : existing.incident.assignedTo;
    if (nextAssignee) {
      await this.assertAssigneeInPool(nextAssignee, nextProjectId);
    }

    // Assigning via PATCH on New auto-moves to Assigned (same lifecycle rule).
    let status = toStatus;
    if (
      dto.assignedTo &&
      fromStatus === "New" &&
      dto.status === undefined
    ) {
      status = "Assigned";
    }

    const title =
      dto.title !== undefined
        ? sanitizePlainText(dto.title, 255)
        : undefined;
    const description =
      dto.description !== undefined
        ? sanitizePlainText(dto.description, 10_000)
        : undefined;
    if (dto.title !== undefined && (!title || title.length < 5)) {
      throw new BadRequestException("Title is required");
    }
    if (
      dto.description !== undefined &&
      (!description || description.length < 10)
    ) {
      throw new BadRequestException("Description is required");
    }

    const [updated] = await this.db
      .update(incidents)
      .set({
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(dto.category !== undefined ? { category: nextCategory } : {}),
        ...(dto.subcategory !== undefined
          ? { subcategory: nextSubcategory }
          : {}),
        ...(dto.impact !== undefined ? { impact: dto.impact } : {}),
        ...(dto.urgency !== undefined ? { urgency: dto.urgency } : {}),
        status,
        ...(dto.assignedTo !== undefined
          ? { assignedTo: dto.assignedTo }
          : {}),
        ...(dto.projectId !== undefined || dto.moduleId !== undefined
          ? { projectId: nextProjectId, moduleId: nextModuleId }
          : {}),
        resolutionNotes,
        priority,
        slaDueAt,
        resolvedAt,
        closedAt,
        updatedAt: now,
      })
      .where(eq(incidents.id, id))
      .returning();

    if (!updated) throw new NotFoundException("Incident not found");

    if (
      status !== fromStatus &&
      (status === "Assigned" ||
        status === "Resolved" ||
        status === "Closed")
    ) {
      try {
        await this.notifyReporterStatus(
          id,
          updated.title,
          existing.incident.reporterId,
          fromStatus,
          status,
          user.name ?? user.email,
          updated.assignedTo,
        );
      } catch {
        // Status update succeeded; mail is best-effort.
      }
    }

    const detail = await this.get(user, id);
    this.events.emitTicketUpdated(id, detail);
    return detail;
  }

  private async notifyReporterStatus(
    ticketId: string,
    ticketTitle: string,
    reporterId: string,
    previousStatus: string,
    newStatus: string,
    actorName: string,
    assigneeId: string | null,
  ) {
    if (
      newStatus !== "Assigned" &&
      newStatus !== "Resolved" &&
      newStatus !== "Closed"
    ) {
      return;
    }

    const ids =
      newStatus === "Assigned"
        ? recipientIds({
            type: "incident.assigned",
            assigneeId: assigneeId ?? reporterId,
            reporterId,
          })
        : recipientIds({
            type:
              newStatus === "Resolved"
                ? "incident.resolved"
                : "incident.closed",
            reporterId,
          });

    const href = `/incidents/${ticketId}`;
    const rows = await this.db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(
        // Prefer loading reporter (and assignee when Assigned)
        eq(users.id, reporterId),
      );

    const [reporter] = rows;
    if (reporter?.email) {
      await this.mail.sendStatusChanged(reporter.email, {
        ticketId,
        ticketTitle,
        previousStatus,
        newStatus,
        actorName,
      });
    }

    for (const uid of ids) {
      await this.notifications.record(
        uid,
        `incident.${newStatus.toLowerCase()}`,
        `${ticketTitle} → ${newStatus}`,
        `Status changed from ${previousStatus} to ${newStatus}`,
        href,
      );
    }
  }

  private async notifyP1Created(ticketId: string, ticketTitle: string) {
    try {
      const admins = await this.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, "Admin"));
      const ids = recipientIds({
        type: "incident.p1_created",
        adminIds: admins.map((a) => a.id),
      });
      const href = `/incidents/${ticketId}`;
      for (const uid of ids) {
        await this.notifications.record(
          uid,
          "incident.p1_created",
          `P1 created: ${ticketTitle}`,
          "A priority-1 incident was opened",
          href,
        );
      }
    } catch {
      // Best-effort
    }
  }

  async listComments(user: AuthUser, incidentId: string): Promise<CommentView[]> {
    await this.get(user, incidentId);

    const rows = await this.db
      .select({
        comment: comments,
        authorName: users.name,
      })
      .from(comments)
      .leftJoin(users, eq(comments.authorId, users.id))
      .where(
        and(
          eq(comments.ticketId, incidentId),
          eq(comments.ticketType, "incident"),
          isNull(comments.deletedAt),
        ),
      )
      .orderBy(asc(comments.createdAt));

    return rows.map((row) => ({
      id: row.comment.id,
      ticketId: row.comment.ticketId,
      ticketType: "incident" as const,
      authorId: row.comment.authorId,
      authorName: row.authorName,
      content: row.comment.content,
      createdAt: row.comment.createdAt.toISOString(),
    }));
  }

  async addComment(
    user: AuthUser,
    incidentId: string,
    dto: CreateCommentDto,
  ): Promise<CommentView> {
    await this.get(user, incidentId);

    const content = sanitizePlainText(dto.content);
    if (!content) {
      throw new BadRequestException("Comment content is required");
    }

    const [created] = await this.db
      .insert(comments)
      .values({
        ticketId: incidentId,
        ticketType: "incident",
        authorId: user.userId,
        content,
      })
      .returning();

    const [author] = await this.db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, user.userId))
      .limit(1);

    const view: CommentView = {
      id: created!.id,
      ticketId: incidentId,
      ticketType: "incident",
      authorId: user.userId,
      authorName: author?.name ?? user.email,
      content: created!.content,
      createdAt: created!.createdAt.toISOString(),
    };

    this.events.emitCommentCreated(incidentId, view);

    try {
      const existing = await this.loadIncidentRow(incidentId);
      if (existing) {
        const ids = recipientIds({
          type: "comment.created",
          reporterId: existing.incident.reporterId,
          assigneeId: existing.incident.assignedTo,
          authorId: user.userId,
        });
        const href = `/incidents/${incidentId}`;
        for (const uid of ids) {
          await this.notifications.record(
            uid,
            "comment.created",
            "New comment",
            "A comment was added on your ticket",
            href,
          );
        }
      }
    } catch {
      // Best-effort in-app notice
    }

    return view;
  }

  private async buildFilters(
    user: AuthUser,
    query: ListIncidentsQueryDto,
  ): Promise<SQL | undefined> {
    const parts: SQL[] = [];

    if (user.role === "EndUser") {
      parts.push(eq(incidents.reporterId, user.userId));
    } else {
      const projectScope = await this.projectAccess.ticketProjectScope(
        user,
        incidents.projectId,
      );
      if (projectScope) parts.push(projectScope);

      if (query.reporterId) {
        parts.push(eq(incidents.reporterId, query.reporterId));
      }
      if (query.assignedTo) {
        parts.push(eq(incidents.assignedTo, query.assignedTo));
      }
    }

    if (query.projectId) {
      if (user.role !== "EndUser") {
        await this.projectAccess.assertCanAccess(user, query.projectId);
      }
      parts.push(eq(incidents.projectId, query.projectId));
    }

    if (query.status) parts.push(eq(incidents.status, query.status));
    if (query.priority) parts.push(eq(incidents.priority, query.priority));

    if (parts.length === 0) return undefined;
    if (parts.length === 1) return parts[0];
    return and(...parts);
  }

  private sortColumn(sortBy: ListIncidentsQueryDto["sortBy"]) {
    switch (sortBy) {
      case "priority":
        return incidents.priority;
      case "status":
        return incidents.status;
      case "slaDueAt":
        return incidents.slaDueAt;
      case "createdAt":
      default:
        return incidents.createdAt;
    }
  }

  private async loadIncidentRow(id: string) {
    const reporter = alias(users, "reporter");
    const assignee = alias(users, "assignee");

    const [row] = await this.db
      .select({
        incident: incidents,
        reporterId: reporter.id,
        reporterName: reporter.name,
        reporterEmail: reporter.email,
        assigneeId: assignee.id,
        assigneeName: assignee.name,
        assigneeEmail: assignee.email,
      })
      .from(incidents)
      .leftJoin(reporter, eq(incidents.reporterId, reporter.id))
      .leftJoin(assignee, eq(incidents.assignedTo, assignee.id))
      .where(eq(incidents.id, id))
      .limit(1);

    if (!row) return null;

    return {
      incident: row.incident,
      reporter: row.reporterId
        ? {
            id: row.reporterId,
            name: row.reporterName!,
            email: row.reporterEmail!,
          }
        : null,
      assignee: row.assigneeId
        ? {
            id: row.assigneeId,
            name: row.assigneeName!,
            email: row.assigneeEmail!,
          }
        : null,
    };
  }

  private toListItem(
    row: typeof incidents.$inferSelect,
    reporterName: string | null,
    assigneeName: string | null,
  ): IncidentListItem {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      subcategory: row.subcategory,
      impact: row.impact,
      urgency: row.urgency,
      priority: row.priority,
      status: row.status,
      assignedTo: row.assignedTo,
      assigneeName,
      reporterId: row.reporterId,
      reporterName,
      projectId: row.projectId,
      moduleId: row.moduleId,
      slaDueAt: row.slaDueAt?.toISOString() ?? null,
      slaBreached: row.slaBreached,
      resolutionNotes: row.resolutionNotes,
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
      closedAt: row.closedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async assertCanRead(
    user: AuthUser,
    reporterId: string,
    projectId: string | null,
  ) {
    if (user.role === "EndUser") {
      if (reporterId !== user.userId) {
        throw new ForbiddenException("Cannot access this incident");
      }
      return;
    }
    await this.projectAccess.assertCanAccessTicketProject(user, projectId);
  }

  private async lookupResolveMinutes(priority: Priority) {
    const [rule] = await this.db
      .select({ resolveMinutes: slaRules.resolveMinutes })
      .from(slaRules)
      .where(eq(slaRules.priority, priority))
      .limit(1);
    return rule?.resolveMinutes ?? null;
  }

  /**
   * Project tickets: assignee must be a project member Agent.
   * Unscoped tickets: Agent or Admin (legacy global pool).
   */
  private async assertAssigneeInPool(
    userId: string,
    projectId: string | null,
  ) {
    const [agent] = await this.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!agent) throw new NotFoundException("Assignee not found");

    const inPool = await this.assignment.isInPool(userId, projectId);
    if (!inPool) {
      throw new BadRequestException(
        projectId
          ? "Assignee must be a member of this project"
          : "Assignee must be an Agent or Admin",
      );
    }
    return agent;
  }
}
