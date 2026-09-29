import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { count, desc, eq, inArray, SQL } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import type { DrizzleDB } from "../database/database.module";
import {
  incidents,
  problemIncidents,
  problems,
  users,
  type ProblemStatus,
} from "../database/schema";
import type {
  CreateProblemDto,
  ListProblemsQueryDto,
  UpdateProblemDto,
} from "./dto/problem.dto";

export type ProblemView = {
  id: string;
  title: string;
  description: string;
  rootCause: string | null;
  knownError: boolean;
  status: ProblemStatus;
  assignedTo: string | null;
  assigneeName: string | null;
  linkedIncidentIds: string[];
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class ProblemsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async list(query: ListProblemsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const filters = this.buildFilters(query);

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

    return {
      data: rows.map((row) =>
        this.toView(
          row.problem,
          row.assigneeName,
          links.get(row.problem.id) ?? [],
        ),
      ),
      meta: {
        page,
        pageSize,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
      },
    };
  }

  async get(id: string): Promise<ProblemView> {
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

    const links = await this.loadLinks([id]);
    return this.toView(
      row.problem,
      row.assigneeName,
      links.get(id) ?? [],
    );
  }

  async create(dto: CreateProblemDto): Promise<ProblemView> {
    if (dto.assignedTo) await this.assertUserExists(dto.assignedTo);
    if (dto.linkedIncidentIds?.length) {
      await this.assertIncidentsExist(dto.linkedIncidentIds);
    }

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
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (dto.linkedIncidentIds?.length) {
      await this.replaceLinks(created!.id, dto.linkedIncidentIds);
    }

    return this.get(created!.id);
  }

  async update(id: string, dto: UpdateProblemDto): Promise<ProblemView> {
    const existing = await this.get(id);

    if (dto.assignedTo) await this.assertUserExists(dto.assignedTo);
    if (dto.linkedIncidentIds) {
      await this.assertIncidentsExist(dto.linkedIncidentIds);
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
        updatedAt: now,
      })
      .where(eq(problems.id, id));

    if (dto.linkedIncidentIds) {
      await this.replaceLinks(existing.id, dto.linkedIncidentIds);
    }

    return this.get(id);
  }

  private buildFilters(query: ListProblemsQueryDto): SQL | undefined {
    if (!query.status) return undefined;
    return eq(problems.status, query.status);
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
      linkedIncidentIds,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
