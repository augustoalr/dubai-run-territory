import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { PolygonGeometry } from "../geo/types";
import { LEAGUE_BANDS } from "../leagues/bands";
import { INITIAL_SEASON, renderInitialSeedSql } from "./render-zone-seed";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const zoneDir = join(root, "supabase/seed/zones");
const migrationPath = join(root, "supabase/migrations/20261027130000_seed_jumeirah_kite.sql");

type FeatureCollection = {
  features: Array<{
    properties?: { role?: string };
    geometry: PolygonGeometry;
  }>;
};

const cellsFile = JSON.parse(readFileSync(join(zoneDir, "jumeirah-kite.cells.json"), "utf8")) as {
  h3Resolution: number;
  cells: string[];
};
const geojson = JSON.parse(
  readFileSync(join(zoneDir, "jumeirah-kite.geojson"), "utf8"),
) as FeatureCollection;
const polygon = geojson.features.find(
  (feature) => feature.properties?.role === "polygon",
)?.geometry;

function render(): string {
  if (!polygon) throw new Error("missing polygon");
  return renderInitialSeedSql({
    slug: "jumeirah-kite",
    name: "Jumeirah · Kite",
    timezone: "Asia/Dubai",
    h3Resolution: cellsFile.h3Resolution,
    polygon,
    cells: cellsFile.cells,
  });
}

describe("jumeirah-kite seed SQL", () => {
  it("matches the committed migration and stays idempotent", () => {
    const sql = render();
    expect(sql).toBe(readFileSync(migrationPath, "utf8"));
    expect(cellsFile.cells).toHaveLength(99);
    for (const h3 of cellsFile.cells) {
      expect(sql).toContain(`'${h3}'`);
    }
    expect(sql).toContain("ON CONFLICT (slug) DO UPDATE");
    expect(sql).toContain("ON CONFLICT (zone_id, h3) DO UPDATE");
    expect(sql).toContain("ON CONFLICT (code) WHERE zone_id IS NULL");
    expect(sql).toContain("WHERE public.seasons.status = 'scheduled'");
    expect(sql).not.toContain("status = EXCLUDED.status");
    expect(sql).toContain(INITIAL_SEASON.name);
    expect(sql).toContain(INITIAL_SEASON.startsAt);
    expect(sql).not.toContain("strava");
    for (const band of LEAGUE_BANDS) {
      expect(sql).toContain(`'${band.code}'`);
    }
  });
});
