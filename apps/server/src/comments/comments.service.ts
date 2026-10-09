import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, asc, eq, isNull } from "drizzle-orm";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import { sanitizePlainText } from "../common/sanitize-plain-text";
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
import { NotificationService } from "../notifications/notification.service";
import { recipientIds } from "../notifications/recipients";
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
    private readonly notifications: NotificationService,
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

    const content = sanitizePlainText(dto.content);
    if (!content) {
      throw new BadRequestException("Comment content is required");
    }

    const [created] = await this.db
      .insert(comments)
      .values({
        ticketId: dto.ticketId,
        ticketType: dto.ticketType,
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
      ticketId: dto.ticketId,
      ticketType: dto.ticketType,
      authorId: user.userId,
      authorName: author?.name ?? user.email,
      content: created!.content,
      createdAt: created!.createdAt.toISOString(),
    };

    this.events.emitCommentCreated(dto.ticketId, view);
    await this.notifyCommentRecipients(dto.ticketType, dto.ticketId, user.userId);
    return view;
  }

  private async notifyCommentRecipients(
    ticketType: CommentTicketType,
    ticketId: string,
    authorId: string,
  ) {
    try {
      let reporterId: string | null = null;
      let assigneeId: string | null = null;
      let href = `/${ticketType}s/${ticketId}`;

      if (ticketType === "incident") {
        const [row] = await this.db
          .select({
            reporterId: incidents.reporterId,
            assignedTo: incidents.assignedTo,
          })
          .from(incidents)
          .where(eq(incidents.id, ticketId))
          .limit(1);
        reporterId = row?.reporterId ?? null;
        assigneeId = row?.assignedTo ?? null;
        href = `/incidents/${ticketId}`;
      } else if (ticketType === "service_request") {
        const [row] = await this.db
          .select({
            requesterId: serviceRequests.requesterId,
            assigneeId: serviceRequests.assigneeId,
          })
          .from(serviceRequests)
          .where(eq(serviceRequests.id, ticketId))
          .limit(1);
        reporterId = row?.requesterId ?? null;
        assigneeId = row?.assigneeId ?? null;
        href = `/service-requests/${ticketId}`;
      } else {
        return;
      }

      if (!reporterId) return;
      const ids = recipientIds({
        type: "comment.created",
        reporterId,
        assigneeId,
        authorId,
      });
      for (const uid of ids) {
        await this.notifications.record(
          uid,
          "comment.created",
          "New comment",
          "A comment was added on your ticket",
          href,
        );
      }
    } catch {
      // Best-effort in-app notice
    }
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
