import zoneFile from "../../../../supabase/seed/zones/jumeirah-kite.json";
import { readZoneGeometry } from "./parse";
import type { ZoneDefinition } from "./types";

const jumeirahGeometry = readZoneGeometry(zoneFile);

/**
 * Jumeirah Beach → Kite Beach.
 * Centerline: OpenStreetMap way 332925290, "Jumeirah Corniche Running Track"
 * (leisure=track, sport=running, surface=tartan), simplified only by dropping
 * points closer than half a metre. The polygon is a 25 m buffer on each side
 * (ARQUITECTURA §7.2). These coordinates are approximate: they come from OSM,
 * not from a survey, and Augusto still has to approve them with a real run.
 * The mapped track runs ~6.8 km from Umm Suqeim / Burj Al Arab, through Kite
 * Beach, to the north end OSM has drawn (Jumeirah 3). It does not yet continue
 * to Jumeirah 1.
 */
export const jumeirahKiteZone: ZoneDefinition = {
  slug: "jumeirah-kite",
  name: { es: "Jumeirah · Kite", en: "Jumeirah · Kite" },
  status: "active",
  h3Resolution: 10,
  timezone: "Asia/Dubai",
  bufferMeters: jumeirahGeometry.bufferMeters,
  approximate: true,
  sourceNote:
    "Approximate corridor from OSM way 332925290 (Jumeirah Corniche Running Track), buffered 25 m. Not a survey.",
  centerline: { type: "LineString", coordinates: jumeirahGeometry.centerline },
  polygon: { type: "Polygon", coordinates: jumeirahGeometry.polygon },
};

/**
 * Future zones are configuration only. They stay in draft until a polygon
 * is added and `scripts/create-zone.ts` cuts their cells. Al Qudra is
 * proposed at resolution 9 because the loop is long (ARQUITECTURA §8).
 */
export const ZONE_CATALOG: readonly ZoneDefinition[] = [
  jumeirahKiteZone,
  {
    slug: "dubai-marina",
    name: { es: "Dubai Marina", en: "Dubai Marina" },
    status: "draft",
    h3Resolution: 10,
    timezone: "Asia/Dubai",
  },
  {
    slug: "al-qudra",
    name: { es: "Al Qudra", en: "Al Qudra" },
    status: "draft",
    h3Resolution: 9,
    timezone: "Asia/Dubai",
  },
  {
    slug: "downtown",
    name: { es: "Downtown", en: "Downtown" },
    status: "draft",
    h3Resolution: 10,
    timezone: "Asia/Dubai",
  },
];

export function getZone(slug: string): ZoneDefinition | undefined {
  return ZONE_CATALOG.find((zone) => zone.slug === slug);
}

export function activeZones(): ZoneDefinition[] {
  return ZONE_CATALOG.filter((zone) => zone.status === "active" && zone.polygon);
}
