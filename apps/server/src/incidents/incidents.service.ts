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
  impact: string;
  urgency: string;
  priority: Priority;
  status: IncidentStatus;
  assignedTo: string | null;
  assigneeName: string | null;
  reporterId: string;
  reporterName: string | null;
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
  ) {}

  async list(user: AuthUser, query: ListIncidentsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const filters = this.buildFilters(user, query);

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
    this.assertCanRead(user, row.incident.reporterId);

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

  async create(user: AuthUser, dto: CreateIncidentDto) {
    const priority = this.priorityCalc.calculate(dto.impact, dto.urgency);
    const now = new Date();
    const resolveMinutes = await this.lookupResolveMinutes(priority);
    const slaDueAt = this.priorityCalc.resolveDueAt(
      priority,
      now,
      resolveMinutes,
    );

    const [created] = await this.db
      .insert(incidents)
      .values({
        title: dto.title,
        description: dto.description,
        category: dto.category,
        impact: dto.impact,
        urgency: dto.urgency,
        priority,
        status: "New",
        reporterId: user.userId,
        slaDueAt,
        slaBreached: false,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.get(user, created!.id);
  }

  async assign(user: AuthUser, id: string, dto: AssignIncidentDto) {
    if (!canAssignIncident(user.role)) {
      throw new ForbiddenException("End users cannot assign incidents");
    }

    const existing = await this.loadIncidentRow(id);
    if (!existing) throw new NotFoundException("Incident not found");

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
      const agent = await this.assertAssigneeIsAgentOrAdmin(agentId);
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

    if (dto.assignedTo !== undefined && dto.assignedTo !== null) {
      await this.assertAssigneeIsAgentOrAdmin(dto.assignedTo);
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

    const [updated] = await this.db
      .update(incidents)
      .set({
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.impact !== undefined ? { impact: dto.impact } : {}),
        ...(dto.urgency !== undefined ? { urgency: dto.urgency } : {}),
        status,
        ...(dto.assignedTo !== undefined
          ? { assignedTo: dto.assignedTo }
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

    const detail = await this.get(user, id);
    this.events.emitTicketUpdated(id, detail);
    return detail;
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
    return view;
  }

  private buildFilters(user: AuthUser, query: ListIncidentsQueryDto): SQL | undefined {
    const parts: SQL[] = [];

    if (user.role === "EndUser") {
      parts.push(eq(incidents.reporterId, user.userId));
    } else {
      if (query.reporterId) {
        parts.push(eq(incidents.reporterId, query.reporterId));
      }
      if (query.assignedTo) {
        parts.push(eq(incidents.assignedTo, query.assignedTo));
      }
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
      impact: row.impact,
      urgency: row.urgency,
      priority: row.priority,
      status: row.status,
      assignedTo: row.assignedTo,
      assigneeName,
      reporterId: row.reporterId,
      reporterName,
      slaDueAt: row.slaDueAt?.toISOString() ?? null,
      slaBreached: row.slaBreached,
      resolutionNotes: row.resolutionNotes,
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
      closedAt: row.closedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private assertCanRead(user: AuthUser, reporterId: string) {
    if (user.role === "EndUser" && reporterId !== user.userId) {
      throw new ForbiddenException("Cannot access this incident");
    }
  }

  private async lookupResolveMinutes(priority: Priority) {
    const [rule] = await this.db
      .select({ resolveMinutes: slaRules.resolveMinutes })
      .from(slaRules)
      .where(eq(slaRules.priority, priority))
      .limit(1);
    return rule?.resolveMinutes ?? null;
  }

  /** Same allowlist as POST /assign — only Agent or Admin may be assigned. */
  private async assertAssigneeIsAgentOrAdmin(userId: string) {
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
    if (agent.role !== "Agent" && agent.role !== "Admin") {
      throw new BadRequestException("Assignee must be an Agent or Admin");
    }
    return agent;
  }
}
