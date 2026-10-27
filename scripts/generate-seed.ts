import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { PolygonGeometry } from "../packages/core/src/geo/types.ts";
import { renderInitialSeedSql } from "../packages/core/src/seed/render-zone-seed.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const zoneDir = join(root, "supabase/seed/zones");
const outFile = join(root, "supabase/migrations/20261027130000_seed_jumeirah_kite.sql");

type FeatureCollection = {
  features: Array<{
    properties?: { role?: string; slug?: string };
    geometry: PolygonGeometry;
  }>;
};

const geojson = JSON.parse(
  readFileSync(join(zoneDir, "jumeirah-kite.geojson"), "utf8"),
) as FeatureCollection;
const cellsFile = JSON.parse(readFileSync(join(zoneDir, "jumeirah-kite.cells.json"), "utf8")) as {
  slug: string;
  h3Resolution: number;
  count: number;
  cells: string[];
};

const polygon = geojson.features.find((feature) => feature.properties?.role === "polygon");
if (!polygon || polygon.geometry.type !== "Polygon") {
  throw new Error("jumeirah-kite.geojson has no polygon feature");
}
if (polygon.properties?.slug !== "jumeirah-kite" || cellsFile.slug !== "jumeirah-kite") {
  throw new Error("seed files are not the jumeirah-kite zone");
}
if (cellsFile.cells.length !== cellsFile.count) {
  throw new Error(`cell file says ${cellsFile.count} but lists ${cellsFile.cells.length}`);
}

const sql = renderInitialSeedSql({
  slug: "jumeirah-kite",
  name: "Jumeirah · Kite",
  timezone: "Asia/Dubai",
  h3Resolution: cellsFile.h3Resolution,
  polygon: polygon.geometry,
  cells: cellsFile.cells,
});

writeFileSync(outFile, sql);
console.log(`seed jumeirah-kite: ${cellsFile.cells.length} cells at H3 ${cellsFile.h3Resolution}`);
