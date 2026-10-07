import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { parseLinkTicketType } from "./knowledge.ticket-type";

describe("parseLinkTicketType", () => {
  it("accepts incident, problem, service_request", () => {
    expect(parseLinkTicketType("incident")).toBe("incident");
    expect(parseLinkTicketType("problem")).toBe("problem");
    expect(parseLinkTicketType("service_request")).toBe("service_request");
  });

  it("rejects unknown ticket types", () => {
    expect(() => parseLinkTicketType("change")).toThrow(BadRequestException);
    expect(() => parseLinkTicketType("")).toThrow(BadRequestException);
  });
});
