import { Module } from "@nestjs/common";
import { MailModule } from "../mail/mail.module";
import { AssignmentController } from "./assignment.controller";
import { AssignmentService } from "./assignment.service";

/** Shared assignment — imported by IncidentsModule and others. */
@Module({
  imports: [MailModule],
  controllers: [AssignmentController],
  providers: [AssignmentService],
  exports: [AssignmentService],
})
export class AssignmentModule {}
