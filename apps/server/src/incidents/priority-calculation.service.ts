import { Injectable } from "@nestjs/common";
import type { ImpactUrgency, Priority } from "../database/schema";
import {
  calculatePriority,
  resolveDueAt,
} from "./priority";

@Injectable()
export class PriorityCalculationService {
  calculate(impact: ImpactUrgency, urgency: ImpactUrgency): Priority {
    return calculatePriority(impact, urgency);
  }

  resolveDueAt(
    priority: Priority,
    from: Date,
    resolveMinutes?: number | null,
  ): Date {
    return resolveDueAt(priority, from, resolveMinutes);
  }
}
