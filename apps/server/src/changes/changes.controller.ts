import { Body, Controller, Get, Param, Patch } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { IsIn, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Roles } from "../common/decorators/roles.decorator";

class UpdateChangeStatusDto {
  @ApiProperty({ enum: ["Draft", "PendingApproval", "Approved", "Rejected", "Scheduled", "Implemented", "Closed"] })
  @IsString()
  @IsIn(["Draft", "PendingApproval", "Approved", "Rejected", "Scheduled", "Implemented", "Closed"])
  status!: string;
}

@ApiTags("changes")
@ApiBearerAuth()
@Controller("changes")
export class ChangesController {
  @Get()
  @Roles("Admin", "Agent")
  @ApiOperation({ summary: "List changes (stub)" })
  list() {
    return { data: [], message: "stub — business logic in later phase" };
  }

  @Get(":id")
  @Roles("Admin", "Agent")
  @ApiOperation({ summary: "Get change by id (stub)" })
  get(@Param("id") id: string) {
    return { id, message: "stub" };
  }

  @Patch(":id/status")
  @Roles("Admin")
  @ApiOperation({ summary: "Approve/update change status — Admin only" })
  updateStatus(@Param("id") id: string, @Body() dto: UpdateChangeStatusDto) {
    return {
      id,
      status: dto.status,
      message: "stub — status change authorized; persistence in later phase",
    };
  }
}
