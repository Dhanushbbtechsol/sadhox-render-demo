import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, count, desc, eq, inArray, SQL } from "drizzle-orm";
import { AssignmentService } from "../assignment/assignment.service";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import { DRIZZLE } from "../database/database.constants";
import type { DrizzleDB } from "../database/database.module";
import {
  incidents,
  problemIncidents,
  problems,
  users,
  type ProblemStatus,
} from "../database/schema";
import { ProjectAccessService } from "../projects/project-access.service";
import { ProjectsService } from "../projects/projects.service";
import { claimReference } from "../incidents/reference";
import type {
  CreateProblemDto,
  ListProblemsQueryDto,
  UpdateProblemDto,
} from "./dto/problem.dto";

export type LinkedIncidentSnippet = {
  id: string;
  referenceCode: string;
  title: string;
  status: string;
  priority: string;
};

export type ProblemView = {
  id: string;
  referenceCode: string;
  title: string;
  description: string;
  rootCause: string | null;
  knownError: boolean;
  status: ProblemStatus;
  assignedTo: string | null;
  assigneeName: string | null;
  projectId: string | null;
  moduleId: string | null;
  linkedIncidentIds: string[];
  linkedIncidents: LinkedIncidentSnippet[];
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class ProblemsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly assignment: AssignmentService,
    private readonly projectAccess: ProjectAccessService,
    private readonly projectsService: ProjectsService,
  ) {}

  async list(user: AuthUser, query: ListProblemsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const filters = await this.buildFilters(user, query);

    const [totalRow] = await this.db
      .select({ total: count() })
      .from(problems)
      .where(filters);

    const total = Number(totalRow?.total ?? 0);

    const rows = await this.db
      .select({
        problem: problems,
        assigneeName: users.name,
      })
      .from(problems)
      .leftJoin(users, eq(problems.assignedTo, users.id))
      .where(filters)
      .orderBy(desc(problems.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const ids = rows.map((r) => r.problem.id);
    const links = await this.loadLinks(ids);
    const snippets = await this.loadIncidentSnippets(
      user,
      [...links.values()].flat(),
    );

    return {
      data: rows.map((row) => {
        const linkedIds = (links.get(row.problem.id) ?? []).filter((id) =>
          snippets.has(id),
        );
        return this.toView(
          row.problem,
          row.assigneeName,
          linkedIds,
          linkedIds
            .map((id) => snippets.get(id))
            .filter((s): s is LinkedIncidentSnippet => Boolean(s)),
        );
      }),
      meta: {
        page,
        pageSize,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
      },
    };
  }

  async get(user: AuthUser, id: string): Promise<ProblemView> {
    const [row] = await this.db
      .select({
        problem: problems,
        assigneeName: users.name,
      })
      .from(problems)
      .leftJoin(users, eq(problems.assignedTo, users.id))
      .where(eq(problems.id, id))
      .limit(1);

    if (!row) throw new NotFoundException("Problem not found");
    await this.projectAccess.assertCanAccessTicketProject(
      user,
      row.problem.projectId,
    );

    const links = await this.loadLinks([id]);
    const rawLinkedIds = links.get(id) ?? [];
    const snippets = await this.loadIncidentSnippets(user, rawLinkedIds);
    const linkedIds = rawLinkedIds.filter((lid) => snippets.has(lid));
    return this.toView(
      row.problem,
      row.assigneeName,
      linkedIds,
      linkedIds
        .map((lid) => snippets.get(lid))
        .filter((s): s is LinkedIncidentSnippet => Boolean(s)),
    );
  }

  async create(user: AuthUser, dto: CreateProblemDto): Promise<ProblemView> {
    if (dto.linkedIncidentIds?.length) {
      await this.assertCanLinkIncidents(user, dto.linkedIncidentIds);
      await this.assertIncidentsNotLinkedElsewhere(dto.linkedIncidentIds);
    }

    let projectId = dto.projectId;
    let moduleId = dto.moduleId;
    if (projectId === undefined && moduleId === undefined) {
      if (!dto.linkedIncidentIds?.length) {
        throw new BadRequestException(
          "Link at least one incident so the problem inherits that ticket's project scope",
        );
      }
      const derived = await this.deriveProjectScopeFromLinkedIncidents(
        dto.linkedIncidentIds,
      );
      projectId = derived.projectId;
      moduleId = derived.moduleId;
    }

    // Agents already work the global (unscoped) incident pool. Let them inherit
    // that null project when creating a Problem from linked incidents. Creating
    // unscoped tickets from scratch remains Admin-only in resolveTicketProjectFields.
    const inheritUnscopedFromLinks =
      Boolean(dto.linkedIncidentIds?.length) &&
      projectId == null &&
      moduleId == null &&
      user.role === "Agent";

    const scope: { projectId: string | null; moduleId: string | null } =
      inheritUnscopedFromLinks
        ? { projectId: null, moduleId: null }
        : await this.projectsService.resolveTicketProjectFields(
            user,
            projectId,
            moduleId,
          );

    if (dto.assignedTo) {
      await this.assertAssigneeInPool(dto.assignedTo, scope.projectId);
    }

    const now = new Date();
    const [created] = await this.db.transaction(async (tx) => {
      const referenceCode = await claimReference(tx, "ISS");
      return tx
        .insert(problems)
        .values({
          referenceCode,
          title: dto.title,
          description: dto.description,
          rootCause: dto.rootCause ?? null,
          knownError: dto.knownError ?? false,
          status: dto.status ?? "Open",
          assignedTo: dto.assignedTo ?? null,
          projectId: scope.projectId,
          moduleId: scope.moduleId,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
    });

    if (dto.linkedIncidentIds?.length) {
      await this.replaceLinks(created!.id, dto.linkedIncidentIds);
    }

    return this.get(user, created!.id);
  }

  async update(
    user: AuthUser,
    id: string,
    dto: UpdateProblemDto,
  ): Promise<ProblemView> {
    const existing = await this.get(user, id);

    let nextProjectId = existing.projectId;
    let nextModuleId = existing.moduleId;
    if (dto.projectId !== undefined || dto.moduleId !== undefined) {
      const scope = await this.projectsService.resolveTicketProjectFields(
        user,
        dto.projectId !== undefined ? dto.projectId : existing.projectId,
        dto.moduleId !== undefined ? dto.moduleId : existing.moduleId,
      );
      nextProjectId = scope.projectId;
      nextModuleId = scope.moduleId;
    }

    const nextAssignee =
      dto.assignedTo !== undefined ? dto.assignedTo : existing.assignedTo;
    if (nextAssignee) {
      await this.assertAssigneeInPool(nextAssignee, nextProjectId);
    }
    if (dto.linkedIncidentIds) {
      await this.assertCanLinkIncidents(user, dto.linkedIncidentIds);
    }

    const now = new Date();
    await this.db
      .update(problems)
      .set({
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.rootCause !== undefined ? { rootCause: dto.rootCause } : {}),
        ...(dto.knownError !== undefined ? { knownError: dto.knownError } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.assignedTo !== undefined
          ? { assignedTo: dto.assignedTo }
          : {}),
        ...(dto.projectId !== undefined || dto.moduleId !== undefined
          ? { projectId: nextProjectId, moduleId: nextModuleId }
          : {}),
        updatedAt: now,
      })
      .where(eq(problems.id, id));

    if (dto.linkedIncidentIds) {
      await this.replaceLinks(existing.id, dto.linkedIncidentIds);
    }

    return this.get(user, id);
  }

  /**
   * Additive link: insert one incident without replacing the full link set.
   * Idempotent when already linked to this problem; rejects if linked elsewhere.
   */
  async linkIncident(
    user: AuthUser,
    problemId: string,
    incidentId: string,
  ): Promise<ProblemView> {
    await this.get(user, problemId);
    await this.assertCanLinkIncidents(user, [incidentId]);

    const [existingLink] = await this.db
      .select({
        problemId: problemIncidents.problemId,
      })
      .from(problemIncidents)
      .where(eq(problemIncidents.incidentId, incidentId))
      .limit(1);

    if (existingLink) {
      if (existingLink.problemId === problemId) {
        return this.get(user, problemId);
      }
      throw new BadRequestException(
        "Incident is already linked to another problem",
      );
    }

    await this.db.insert(problemIncidents).values({
      problemId,
      incidentId,
    });

    return this.get(user, problemId);
  }

  private async buildFilters(
    user: AuthUser,
    query: ListProblemsQueryDto,
  ): Promise<SQL | undefined> {
    const parts: SQL[] = [];

    const projectScope = await this.projectAccess.ticketProjectScope(
      user,
      problems.projectId,
    );
    if (projectScope) parts.push(projectScope);

    if (query.projectId) {
      await this.projectAccess.assertCanAccess(user, query.projectId);
      parts.push(eq(problems.projectId, query.projectId));
    }

    if (query.status) parts.push(eq(problems.status, query.status));

    if (parts.length === 0) return undefined;
    if (parts.length === 1) return parts[0];
    return and(...parts);
  }

  private async loadLinks(problemIds: string[]) {
    const map = new Map<string, string[]>();
    if (problemIds.length === 0) return map;

    const rows = await this.db
      .select({
        problemId: problemIncidents.problemId,
        incidentId: problemIncidents.incidentId,
      })
      .from(problemIncidents)
      .where(inArray(problemIncidents.problemId, problemIds));

    for (const row of rows) {
      const list = map.get(row.problemId) ?? [];
      list.push(row.incidentId);
      map.set(row.problemId, list);
    }
    return map;
  }

  private async replaceLinks(problemId: string, incidentIds: string[]) {
    await this.db
      .delete(problemIncidents)
      .where(eq(problemIncidents.problemId, problemId));

    if (incidentIds.length === 0) return;

    await this.db.insert(problemIncidents).values(
      incidentIds.map((incidentId) => ({
        problemId,
        incidentId,
      })),
    );
  }

  private async loadIncidentSnippets(
    user: AuthUser,
    incidentIds: string[],
  ) {
    const map = new Map<string, LinkedIncidentSnippet>();
    if (incidentIds.length === 0) return map;

    const rows = await this.db
      .select({
        id: incidents.id,
        referenceCode: incidents.referenceCode,
        title: incidents.title,
        status: incidents.status,
        priority: incidents.priority,
        projectId: incidents.projectId,
      })
      .from(incidents)
      .where(inArray(incidents.id, incidentIds));

    for (const row of rows) {
      if (!(await this.canViewIncidentProject(user, row.projectId))) continue;
      map.set(row.id, {
        id: row.id,
        referenceCode: row.referenceCode,
        title: row.title,
        status: row.status,
        priority: row.priority,
      });
    }
    return map;
  }

  /** Project/module stamp from the linked incident(s) — must share one scope. */
  private async deriveProjectScopeFromLinkedIncidents(incidentIds: string[]) {
    const rows = await this.db
      .select({
        projectId: incidents.projectId,
        moduleId: incidents.moduleId,
      })
      .from(incidents)
      .where(inArray(incidents.id, incidentIds));

    if (rows.length !== incidentIds.length) {
      throw new BadRequestException("One or more incident IDs are invalid");
    }

    const first = rows[0]!;
    for (const row of rows.slice(1)) {
      if (
        row.projectId !== first.projectId ||
        row.moduleId !== first.moduleId
      ) {
        throw new BadRequestException(
          "Linked incidents must belong to the same project and module",
        );
      }
    }

    return {
      projectId: first.projectId ?? null,
      moduleId: first.moduleId ?? null,
    };
  }

  private async assertIncidentsNotLinkedElsewhere(incidentIds: string[]) {
    const rows = await this.db
      .select({ incidentId: problemIncidents.incidentId })
      .from(problemIncidents)
      .where(inArray(problemIncidents.incidentId, incidentIds))
      .limit(1);
    if (rows.length > 0) {
      throw new BadRequestException(
        "Incident is already linked to another problem",
      );
    }
  }

  /** Link only incidents the actor can already view (blocks cross-project probe). */
  private async assertCanLinkIncidents(user: AuthUser, ids: string[]) {
    if (ids.length === 0) return;

    const rows = await this.db
      .select({ id: incidents.id, projectId: incidents.projectId })
      .from(incidents)
      .where(inArray(incidents.id, ids));

    if (rows.length !== ids.length) {
      throw new BadRequestException("One or more incident IDs are invalid");
    }

    for (const row of rows) {
      await this.projectAccess.assertCanViewTicket(user, row.projectId);
    }
  }

  private async canViewIncidentProject(
    user: AuthUser,
    projectId: string | null,
  ): Promise<boolean> {
    try {
      await this.projectAccess.assertCanViewTicket(user, projectId);
      return true;
    } catch {
      return false;
    }
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
      .select({ id: users.id })
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
  }

  private toView(
    row: typeof problems.$inferSelect,
    assigneeName: string | null,
    linkedIncidentIds: string[],
    linkedIncidents: LinkedIncidentSnippet[] = [],
  ): ProblemView {
    return {
      id: row.id,
      referenceCode: row.referenceCode,
      title: row.title,
      description: row.description,
      rootCause: row.rootCause,
      knownError: row.knownError,
      status: row.status,
      assignedTo: row.assignedTo,
      assigneeName,
      projectId: row.projectId,
      moduleId: row.moduleId,
      linkedIncidentIds,
      linkedIncidents,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
