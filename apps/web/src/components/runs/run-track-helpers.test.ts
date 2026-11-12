import { describe, expect, it } from "vitest";
import {
  computeSvgTrackData,
  computeTrackBounds,
  isRenderableTrack,
  resolveTrackCoordinates,
} from "./run-track-helpers";

const SAMPLE_GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test">
  <trk><trkseg>
    <trkpt lat="25.1500" lon="55.2000"><time>2026-11-10T06:00:00Z</time></trkpt>
    <trkpt lat="25.1530" lon="55.2030"><time>2026-11-10T06:05:00Z</time></trkpt>
  </trkseg></trk>
</gpx>`;

describe("run-track-helpers", () => {
  it("prioritizes explicit coordinates over GPX when non-empty", () => {
    const resolved = resolveTrackCoordinates({
      gpx: SAMPLE_GPX,
      coordinates: [
        [55.21, 25.16],
        [55.22, 25.17],
      ],
    });
    expect(resolved).toEqual([
      [55.21, 25.16],
      [55.22, 25.17],
    ]);
  });

  it("falls back to parsing GPX when coordinates are absent or empty", () => {
    const resolved = resolveTrackCoordinates({
      gpx: SAMPLE_GPX,
      coordinates: [],
    });
    expect(resolved).toHaveLength(2);
    expect(resolved[0]).toEqual([55.2, 25.15]);
  });

  it("handles missing or malformed GPX cleanly and detects non-renderable tracks", () => {
    expect(resolveTrackCoordinates({})).toEqual([]);
    expect(resolveTrackCoordinates({ gpx: "<not-gpx>" })).toEqual([]);
    expect(isRenderableTrack([])).toBe(false);
    expect(isRenderableTrack([[55.2, 25.15]])).toBe(false);
    expect(
      isRenderableTrack([
        [55.2, 25.15],
        [55.21, 25.16],
      ]),
    ).toBe(true);
  });

  it("computes bounding box and SVG projection for valid tracks", () => {
    const coords: [number, number][] = [
      [55.2, 25.15],
      [55.205, 25.155],
    ];
    const bounds = computeTrackBounds(coords);
    expect(bounds).not.toBeNull();
    expect(bounds?.isVeryShort).toBe(false);

    const svg = computeSvgTrackData(coords, bounds);
    expect(svg?.isVeryShort).toBe(false);
    expect(svg?.polyline).toBeTruthy();
    expect(svg?.endPt).not.toBeNull();
  });
});
