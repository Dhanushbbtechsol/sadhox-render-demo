import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  CurrentUser,
  type AuthUser,
} from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { CommentsService } from "./comments.service";
import { CreatePolymorphicCommentDto } from "./dto/create-comment.dto";
import { ListCommentsQueryDto } from "./dto/list-comments-query.dto";

@ApiTags("comments")
@ApiBearerAuth()
@Controller("comments")
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get()
  @Roles("Admin", "Agent", "EndUser")
  @ApiOperation({
    summary:
      "List comments for a ticket (incident|problem|service_request|change)",
  })
  list(@CurrentUser() user: AuthUser, @Query() query: ListCommentsQueryDto) {
    return this.comments.list(user, query.ticketType, query.ticketId);
  }

  @Post()
  @HttpCode(201)
  @Roles("Admin", "Agent", "EndUser")
  @ApiOperation({
    summary: "Create a polymorphic comment and broadcast on ticket room",
  })
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePolymorphicCommentDto,
  ) {
    return this.comments.create(user, dto);
  }
}
