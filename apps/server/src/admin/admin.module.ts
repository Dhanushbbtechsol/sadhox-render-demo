import { Module } from "@nestjs/common";
import { IncidentsModule } from "../incidents/incidents.module";
import { QueuesModule } from "../queues/queues.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  imports: [QueuesModule, IncidentsModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
