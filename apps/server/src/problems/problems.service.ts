import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, count, desc, eq, inArray, SQL } from "drizzle-orm";
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
import type {
  CreateProblemDto,
  ListProblemsQueryDto,
  UpdateProblemDto,
} from "./dto/problem.dto";

export type LinkedIncidentSnippet = {
  id: string;
  title: string;
  status: string;
  priority: string;
};

export type ProblemView = {
  id: string;
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
      [...links.values()].flat(),
    );

    return {
      data: rows.map((row) => {
        const linkedIds = links.get(row.problem.id) ?? [];
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
    const linkedIds = links.get(id) ?? [];
    const snippets = await this.loadIncidentSnippets(linkedIds);
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
    if (dto.assignedTo) await this.assertUserExists(dto.assignedTo);
    if (dto.linkedIncidentIds?.length) {
      await this.assertIncidentsExist(dto.linkedIncidentIds);
    }

    const scope = await this.projectsService.resolveTicketProjectFields(
      user,
      dto.projectId,
      dto.moduleId,
    );

    const now = new Date();
    const [created] = await this.db
      .insert(problems)
      .values({
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

    if (dto.assignedTo) await this.assertUserExists(dto.assignedTo);
    if (dto.linkedIncidentIds) {
      await this.assertIncidentsExist(dto.linkedIncidentIds);
    }

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
    await this.assertIncidentsExist([incidentId]);

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

  private async loadIncidentSnippets(incidentIds: string[]) {
    const map = new Map<string, LinkedIncidentSnippet>();
    if (incidentIds.length === 0) return map;

    const rows = await this.db
      .select({
        id: incidents.id,
        title: incidents.title,
        status: incidents.status,
        priority: incidents.priority,
      })
      .from(incidents)
      .where(inArray(incidents.id, incidentIds));

    for (const row of rows) {
      map.set(row.id, row);
    }
    return map;
  }

  private async assertIncidentsExist(ids: string[]) {
    const rows = await this.db
      .select({ id: incidents.id })
      .from(incidents)
      .where(inArray(incidents.id, ids));

    if (rows.length !== ids.length) {
      throw new BadRequestException("One or more incident IDs are invalid");
    }
  }

  private async assertUserExists(userId: string) {
    const [row] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!row) throw new NotFoundException("Assignee not found");
  }

  private toView(
    row: typeof problems.$inferSelect,
    assigneeName: string | null,
    linkedIncidentIds: string[],
    linkedIncidents: LinkedIncidentSnippet[] = [],
  ): ProblemView {
    return {
      id: row.id,
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
