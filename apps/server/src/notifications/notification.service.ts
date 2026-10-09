import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import type { DrizzleDB } from "../database/database.module";
import { notifications } from "../database/schema";

@Injectable()
export class NotificationService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async record(
    userId: string,
    type: string,
    title: string,
    body: string | null,
    href: string | null,
  ) {
    const [row] = await this.db
      .insert(notifications)
      .values({
        userId,
        type,
        title,
        body,
        href,
      })
      .returning();
    return row!;
  }

  async listForUser(userId: string, limit = 30) {
    return this.db
      .select({
        id: notifications.id,
        type: notifications.type,
        title: notifications.title,
        body: notifications.body,
        href: notifications.href,
        readAt: notifications.readAt,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async markRead(userId: string, id: string) {
    const [row] = await this.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(eq(notifications.id, id), eq(notifications.userId, userId)),
      )
      .returning({
        id: notifications.id,
        userId: notifications.userId,
        readAt: notifications.readAt,
      });
    return row ?? null;
  }
}
