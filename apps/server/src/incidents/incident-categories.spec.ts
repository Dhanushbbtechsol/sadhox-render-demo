import { describe, expect, it } from "vitest";
import {
  INCIDENT_CATEGORIES,
  isValidIncidentCategoryPair,
} from "./incident-categories";

describe("incident category map", () => {
  it("exposes the five Phase 7 categories", () => {
    expect(INCIDENT_CATEGORIES).toEqual([
      "Hardware",
      "Software & OS",
      "Network & Connectivity",
      "Identity & Access",
      "Collaboration",
    ]);
  });

  it("accepts matching pairs and rejects mismatches", () => {
    expect(
      isValidIncidentCategoryPair("Hardware", "Laptop/Desktop"),
    ).toBe(true);
    expect(
      isValidIncidentCategoryPair("Hardware", "Email & Calendar"),
    ).toBe(false);
    expect(isValidIncidentCategoryPair("Email", "Other")).toBe(false);
  });
});
