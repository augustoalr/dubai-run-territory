import type { LineStringGeometry, PolygonGeometry } from "../geo/types";

export type ZoneStatus = "draft" | "active" | "archived";

export type LocalizedName = {
  es: string;
  en: string;
};

/**
 * A playable area. Adding Marina, Al Qudra or Downtown is a new object
 * in the catalog (polygon + resolution), not a change to the engine.
 */
export type ZoneDefinition = {
  slug: string;
  name: LocalizedName;
  status: ZoneStatus;
  /** H3 resolution used to cut this zone into cells. */
  h3Resolution: number;
  timezone: string;
  /** Metres of corridor around the centerline. Present once the polygon exists. */
  bufferMeters?: number;
  /**
   * True when the geometry is traced from public map data and still needs
   * a real run from Augusto before it is treated as surveyed.
   */
  approximate?: boolean;
  sourceNote?: string;
  centerline?: LineStringGeometry;
  polygon?: PolygonGeometry;
};
