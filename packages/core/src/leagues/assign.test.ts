import { describe, expect, it } from "vitest";
import { formatPace } from "../format/pace";
import { assignLeague } from "./assign";

describe("assignLeague", () => {
  it("follows the pace bands, including the exact edges", () => {
    expect(assignLeague(254)).toBe("elite");
    expect(assignLeague(255)).toBe("advanced");
    expect(assignLeague(314)).toBe("advanced");
    expect(assignLeague(315)).toBe("intermediate");
    expect(assignLeague(374)).toBe("intermediate");
    expect(assignLeague(375)).toBe("starter");
    expect(assignLeague(4 * 60 + 14.4)).toBe("elite");
    expect(assignLeague(6 * 60 + 15)).toBe("starter");
  });

  it("formats a rounded mark as m:ss", () => {
    expect(formatPace(312)).toBe("5:12");
    expect(formatPace(255)).toBe("4:15");
  });
});
