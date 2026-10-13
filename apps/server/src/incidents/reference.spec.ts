import { allocateReference, emptyCounters } from "./reference";

describe("display references", () => {
  it("numbers incidents in order", () => {
    const first = allocateReference(emptyCounters(), "INC");
    const second = allocateReference(first.counters, "INC");
    expect(first.reference).toBe("INC-000001");
    expect(second.reference).toBe("INC-000002");
  });

  it("keeps request and change counters apart", () => {
    const requests = allocateReference(emptyCounters(), "REQ");
    const changes = allocateReference(requests.counters, "CHG");
    expect(requests.reference).toBe("REQ-000001");
    expect(changes.reference).toBe("CHG-000001");
  });

  it("numbers users and projects on their own counters", () => {
    const user = allocateReference(emptyCounters(), "USR");
    const project = allocateReference(user.counters, "PRJ");
    expect(user.reference).toBe("USR-000001");
    expect(project.reference).toBe("PRJ-000001");
  });

  it("does not hand the same number to two claims of one snapshot", () => {
    const start = emptyCounters();
    const a = allocateReference(start, "INC");
    const b = allocateReference(a.counters, "INC");
    expect(a.reference).not.toBe(b.reference);
  });

  it("rolls a failed claim back so the next create can use that number", () => {
    const start = emptyCounters();
    const failed = allocateReference(start, "INC");
    const retry = allocateReference(start, "INC");
    expect(failed.reference).toBe("INC-000001");
    expect(retry.reference).toBe("INC-000001");
  });
});
