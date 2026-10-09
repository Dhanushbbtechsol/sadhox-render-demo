import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  CurrentUser,
  type AuthUser,
} from "../common/decorators/current-user.decorator";
import { NotificationService } from "./notification.service";

@ApiTags("notifications")
@ApiBearerAuth()
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationService) {}

  @Get()
  @ApiOperation({ summary: "Last 30 in-app notifications for the current user" })
  list(@CurrentUser() user: AuthUser) {
    return this.notifications.listForUser(user.userId, 30);
  }

  @Patch(":id/read")
  @ApiOperation({ summary: "Mark a notification read (own rows only)" })
  async markRead(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const row = await this.notifications.markRead(user.userId, id);
    if (!row) throw new NotFoundException("Notification not found");
    return { id: row.id, readAt: row.readAt };
  }
}
