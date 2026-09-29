import { pickRoundRobinCandidate } from "./assignment.service";

describe("pickRoundRobinCandidate", () => {
  it("cycles fairly across equal-load candidates", () => {
    const agents = ["a", "b", "c"];
    expect(pickRoundRobinCandidate(agents, 0)).toBe("a");
    expect(pickRoundRobinCandidate(agents, 1)).toBe("b");
    expect(pickRoundRobinCandidate(agents, 2)).toBe("c");
    expect(pickRoundRobinCandidate(agents, 3)).toBe("a");
  });

  it("throws when the candidate pool is empty", () => {
    expect(() => pickRoundRobinCandidate([], 0)).toThrow(/No candidates/);
  });
});
