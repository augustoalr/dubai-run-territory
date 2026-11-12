import { describe, expect, it } from "vitest";
import { KNOWN_REASON_CODES, resolveRunReasonInfo } from "./run-reason";

describe("resolveRunReasonInfo", () => {
  it("returns null when rejectCode is null or whitespace", () => {
    expect(resolveRunReasonInfo("rejected", null)).toBeNull();
    expect(resolveRunReasonInfo("accepted", "")).toBeNull();
    expect(resolveRunReasonInfo("review", "   ")).toBeNull();
  });

  it("uses info variant and note label when accepted run has a code such as TOO_SHORT", () => {
    expect(resolveRunReasonInfo("accepted", "TOO_SHORT")).toEqual({
      variant: "info",
      labelKind: "note",
      reasonKey: "TOO_SHORT",
    });
  });

  it("uses review amber variant and reason label when status is review", () => {
    expect(resolveRunReasonInfo("review", "GPS_SPIKES")).toEqual({
      variant: "review",
      labelKind: "reason",
      reasonKey: "GPS_SPIKES",
    });
  });

  it("uses rejected red variant and reason label for rejected and voided runs", () => {
    expect(resolveRunReasonInfo("rejected", "BIKE_PATTERN")).toEqual({
      variant: "rejected",
      labelKind: "reason",
      reasonKey: "BIKE_PATTERN",
    });
    expect(resolveRunReasonInfo("voided", "DUPLICATE")).toEqual({
      variant: "rejected",
      labelKind: "reason",
      reasonKey: "DUPLICATE",
    });
  });

  it("uses info neutral variant for pending and processing runs if rejectCode exists", () => {
    expect(resolveRunReasonInfo("pending", "RATE_LIMIT")).toEqual({
      variant: "info",
      labelKind: "reason",
      reasonKey: "RATE_LIMIT",
    });
    expect(resolveRunReasonInfo("processing", "CADENCE")).toEqual({
      variant: "info",
      labelKind: "reason",
      reasonKey: "CADENCE",
    });
  });

  it("supports all 12 known ReasonCodes and maps unrecognized strings to unknown", () => {
    for (const code of KNOWN_REASON_CODES) {
      expect(resolveRunReasonInfo("rejected", code)?.reasonKey).toBe(code);
    }
    expect(resolveRunReasonInfo("rejected", "CUSTOM_SERVER_ERROR")).toEqual({
      variant: "rejected",
      labelKind: "reason",
      reasonKey: "unknown",
    });
  });
});
