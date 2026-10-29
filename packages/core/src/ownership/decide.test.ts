import { describe, expect, it } from "vitest";
import { decideClaim, type CellMark } from "./decide";

const owner: CellMark = {
  userId: "a",
  paceS: 300,
  crossedAt: 2_000,
  uploadedAt: 5_000,
};

describe("decideClaim", () => {
  it("conquers an empty cell", () => {
    expect(decideClaim(null, { ...owner, userId: "b" })).toBe("conquest");
  });

  it("steals only when the rounded pace is strictly faster", () => {
    expect(decideClaim(owner, { ...owner, userId: "b", paceS: 299 })).toBe("steal");
    expect(decideClaim(owner, { ...owner, userId: "b", paceS: 301 })).toBe("defend");
  });

  it("keeps the runner who crossed first when the pace ties", () => {
    expect(decideClaim(owner, { ...owner, userId: "b", crossedAt: 1_000 })).toBe("steal");
    expect(decideClaim(owner, { ...owner, userId: "b", crossedAt: 3_000 })).toBe("defend");
    expect(decideClaim(owner, { ...owner, userId: "b", crossedAt: 2_000, uploadedAt: 4_000 })).toBe(
      "steal",
    );
    expect(decideClaim(owner, { ...owner, userId: "b", crossedAt: 2_000, uploadedAt: 6_000 })).toBe(
      "defend",
    );
  });

  it("improves the owner's own mark and ignores a slower repeat", () => {
    expect(decideClaim(owner, { ...owner, paceS: 290 })).toBe("improve");
    expect(decideClaim(owner, { ...owner, paceS: 310 })).toBe("keep");
  });
});
