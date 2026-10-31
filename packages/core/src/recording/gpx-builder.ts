import type { RecordedPoint } from "./types";

export type BuildGpxOptions = {
  name?: string;
  startTime?: number;
};

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Builds a valid GPX 1.1 XML document from recorded GPS points.
 * Compatible with standard GPX consumers and packages/core's parseGpx parser.
 */
export function buildGpx(points: readonly RecordedPoint[], options?: BuildGpxOptions): string {
  const trackName = escapeXml(options?.name?.trim() || "Carrera Dubái");
  const firstPoint = points[0];
  const startTime = options?.startTime ?? (firstPoint ? firstPoint.time : Date.now());
  const isoStartTime = new Date(startTime).toISOString();

  const trkptXml = points
    .map((pt) => {
      const isoTime = new Date(pt.time).toISOString();
      const eleElement =
        pt.ele !== undefined && Number.isFinite(pt.ele)
          ? `\n        <ele>${pt.ele.toFixed(1)}</ele>`
          : "";
      return `      <trkpt lat="${pt.lat.toFixed(7)}" lon="${pt.lon.toFixed(7)}">${eleElement}\n        <time>${isoTime}</time>\n      </trkpt>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Runners Dubai PWA" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${trackName}</name>
    <time>${isoStartTime}</time>
  </metadata>
  <trk>
    <name>${trackName}</name>
    <type>running</type>
    <trkseg>
${trkptXml}
    </trkseg>
  </trk>
</gpx>
`;
}
