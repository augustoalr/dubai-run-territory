import { describe, expect, it } from "vitest";
import {
  CELL_EFFORT_WINDOW_M,
  CellEffortError,
  parseCellEffort,
  parseCellEfforts,
} from "./cell-effort";

const effort = {
  h3: "8a43a136148ffff",
  crossedAt: "2026-11-02T06:15:00.000Z",
  paceS: 300,
  windowStartM: 120.5,
  windowEndM: 1120.5,
};

describe("CellEffort", () => {
  it("accepts the JSON shape T-12 will store", () => {
    expect(parseCellEffort(effort)).toEqual(effort);
    expect(parseCellEfforts([effort])).toEqual([effort]);
    expect(CELL_EFFORT_WINDOW_M).toBe(1000);
  });

  it("rejects a window that is not 1 km, a fractional pace and a duplicate cell", () => {
    expect(() => parseCellEffort({ ...effort, paceS: 300.4 })).toThrow(CellEffortError);
    expect(() => parseCellEffort({ ...effort, windowEndM: 1120 })).toThrow(CellEffortError);
    expect(() => parseCellEffort({ ...effort, extra: true })).toThrow(CellEffortError);
    expect(() => parseCellEfforts([effort, effort])).toThrow(/duplicate cell/);
    expect(() => parseCellEffort({ ...effort, crossedAt: "2026-11-02" })).toThrow(CellEffortError);
  });
});
