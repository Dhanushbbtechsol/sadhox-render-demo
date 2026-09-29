import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, asc, eq, isNull } from "drizzle-orm";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import { DRIZZLE } from "../database/database.constants";
import type { DrizzleDB } from "../database/database.module";
import {
  changes,
  comments,
  incidents,
  problems,
  serviceRequests,
  users,
} from "../database/schema";
import { EventsService } from "../events/events.service";
import type {
  CommentTicketType,
  CreatePolymorphicCommentDto,
} from "./dto/create-comment.dto";

export type CommentView = {
  id: string;
  ticketId: string;
  ticketType: CommentTicketType;
  authorId: string;
  authorName: string | null;
  content: string;
  createdAt: string;
};

@Injectable()
export class CommentsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly events: EventsService,
  ) {}

  async list(
    user: AuthUser,
    ticketType: CommentTicketType,
    ticketId: string,
  ): Promise<CommentView[]> {
    await this.assertCanAccess(user, ticketType, ticketId);

    const rows = await this.db
      .select({
        comment: comments,
        authorName: users.name,
      })
      .from(comments)
      .leftJoin(users, eq(comments.authorId, users.id))
      .where(
        and(
          eq(comments.ticketId, ticketId),
          eq(comments.ticketType, ticketType),
          isNull(comments.deletedAt),
        ),
      )
      .orderBy(asc(comments.createdAt));

    return rows.map((row) => ({
      id: row.comment.id,
      ticketId: row.comment.ticketId,
      ticketType,
      authorId: row.comment.authorId,
      authorName: row.authorName,
      content: row.comment.content,
      createdAt: row.comment.createdAt.toISOString(),
    }));
  }

  async create(
    user: AuthUser,
    dto: CreatePolymorphicCommentDto,
  ): Promise<CommentView> {
    await this.assertCanAccess(user, dto.ticketType, dto.ticketId);

    const [created] = await this.db
      .insert(comments)
      .values({
        ticketId: dto.ticketId,
        ticketType: dto.ticketType,
        authorId: user.userId,
        content: dto.content.trim(),
      })
      .returning();

    const [author] = await this.db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, user.userId))
      .limit(1);

    const view: CommentView = {
      id: created!.id,
      ticketId: dto.ticketId,
      ticketType: dto.ticketType,
      authorId: user.userId,
      authorName: author?.name ?? user.email,
      content: created!.content,
      createdAt: created!.createdAt.toISOString(),
    };

    this.events.emitCommentCreated(dto.ticketId, view);
    return view;
  }

  private async assertCanAccess(
    user: AuthUser,
    ticketType: CommentTicketType,
    ticketId: string,
  ) {
    if (ticketType === "incident") {
      const [row] = await this.db
        .select({
          id: incidents.id,
          reporterId: incidents.reporterId,
        })
        .from(incidents)
        .where(eq(incidents.id, ticketId))
        .limit(1);
      if (!row) throw new NotFoundException("Incident not found");
      if (
        user.role === "EndUser" &&
        row.reporterId !== user.userId
      ) {
        throw new ForbiddenException("Cannot access this incident");
      }
      return;
    }

    if (ticketType === "service_request") {
      const [row] = await this.db
        .select({
          id: serviceRequests.id,
          requesterId: serviceRequests.requesterId,
        })
        .from(serviceRequests)
        .where(eq(serviceRequests.id, ticketId))
        .limit(1);
      if (!row) throw new NotFoundException("Service request not found");
      if (
        user.role === "EndUser" &&
        row.requesterId !== user.userId
      ) {
        throw new ForbiddenException("Cannot access this service request");
      }
      return;
    }

    if (ticketType === "change") {
      if (user.role === "EndUser") {
        throw new ForbiddenException("EndUser cannot access changes");
      }
      const [row] = await this.db
        .select({ id: changes.id })
        .from(changes)
        .where(eq(changes.id, ticketId))
        .limit(1);
      if (!row) throw new NotFoundException("Change not found");
      return;
    }

    // problem — Admin/Agent only
    if (user.role === "EndUser") {
      throw new ForbiddenException("EndUser cannot access problems");
    }
    const [row] = await this.db
      .select({ id: problems.id })
      .from(problems)
      .where(eq(problems.id, ticketId))
      .limit(1);
    if (!row) throw new NotFoundException("Problem not found");
  }
}
