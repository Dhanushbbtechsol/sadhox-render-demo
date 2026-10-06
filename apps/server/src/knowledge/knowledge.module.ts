import { Module, OnModuleInit } from "@nestjs/common";
import { KnowledgeController } from "./knowledge.controller";
import { KnowledgeService } from "./knowledge.service";

@Module({
  controllers: [KnowledgeController],
  providers: [KnowledgeService],
  exports: [KnowledgeService],
})
export class KnowledgeModule implements OnModuleInit {
  constructor(private readonly knowledge: KnowledgeService) {}

  async onModuleInit() {
    try {
      await this.knowledge.ensureSeeded();
    } catch (error) {
      console.warn(
        "[knowledge] seed skipped (database may be unavailable):",
        error instanceof Error ? error.message : error,
      );
    }
  }
}
