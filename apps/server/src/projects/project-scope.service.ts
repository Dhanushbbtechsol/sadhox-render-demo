import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import type { DrizzleDB } from "../database/database.module";
import { modules, projects, users } from "../database/schema";

/** Phase 6 — shared ticket project/module validation (membership + module∈project). */
@Injectable()
export class ProjectScopeService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  /**
   * When moduleId is set, it must belong to projectId.
   * moduleId without projectId is invalid. projectId alone is OK (global module unset).
   */
  async assertModuleBelongsToProject(
    projectId: string | null | undefined,
    moduleId: string | null | undefined,
  ): Promise<void> {
    if (moduleId == null) return;

    if (projectId == null) {
      throw new BadRequestException(
        "moduleId requires projectId on the same ticket",
      );
    }

    const [mod] = await this.db
      .select({
        id: modules.id,
        projectId: modules.projectId,
      })
      .from(modules)
      .where(eq(modules.id, moduleId))
      .limit(1);

    if (!mod) {
      throw new NotFoundException("Module not found");
    }
    if (mod.projectId !== projectId) {
      throw new BadRequestException(
        "moduleId does not belong to the ticket projectId",
      );
    }
  }

  async assertProjectExists(projectId: string): Promise<void> {
    const [row] = await this.db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    if (!row) throw new NotFoundException("Project not found");
  }

  /** project_members may only reference Agent users (Managers supervise; not workers). */
  async assertUserIsAgentForMembership(userId: string): Promise<void> {
    const [user] = await this.db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) throw new NotFoundException("User not found");
    if (user.role !== "Agent") {
      throw new BadRequestException(
        "Only Agent users can be project members (Managers supervise; Admins are global)",
      );
    }
  }

  async resolveTicketProjectScope(input: {
    projectId?: string | null;
    moduleId?: string | null;
    existingProjectId?: string | null;
    existingModuleId?: string | null;
  }): Promise<{ projectId: string | null; moduleId: string | null }> {
    const projectId =
      input.projectId !== undefined
        ? input.projectId
        : (input.existingProjectId ?? null);
    const moduleId =
      input.moduleId !== undefined
        ? input.moduleId
        : (input.existingModuleId ?? null);

    if (projectId) await this.assertProjectExists(projectId);
    await this.assertModuleBelongsToProject(projectId, moduleId);
    return { projectId, moduleId };
  }
}
