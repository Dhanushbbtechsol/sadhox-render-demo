import { Module } from "@nestjs/common";
import { MailModule } from "../mail/mail.module";
import { AssignmentService } from "./assignment.service";

/** Shared assignment — imported by IncidentsModule (Dev A) and others. */
@Module({
  imports: [MailModule],
  providers: [AssignmentService],
  exports: [AssignmentService],
})
export class AssignmentModule {}
