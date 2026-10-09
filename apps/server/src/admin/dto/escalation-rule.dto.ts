import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsIn } from "class-validator";

export const ESCALATION_PRIORITIES = ["P1", "P2", "P3", "P4"] as const;
export type EscalationPriority = (typeof ESCALATION_PRIORITIES)[number];

/** Phase 9 — PATCH body `{ notifyManager, notifyAdmin }`. */
export class UpdateEscalationRuleDto {
  @ApiProperty()
  @IsBoolean()
  notifyManager!: boolean;

  @ApiProperty()
  @IsBoolean()
  notifyAdmin!: boolean;
}

export class UpdateEscalationRuleBodyDto extends UpdateEscalationRuleDto {
  @ApiProperty({ enum: ESCALATION_PRIORITIES })
  @IsIn(ESCALATION_PRIORITIES)
  priority!: EscalationPriority;
}
