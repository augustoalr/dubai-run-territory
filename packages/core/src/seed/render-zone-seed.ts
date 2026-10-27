import type { PolygonGeometry } from "../geo/types";
import { LEAGUE_BANDS, type LeagueCode } from "../leagues/bands";
import { assertResolution, cellCenter, cellPolygon } from "../zones/cells";

/**
 * Provisional season 1. Monday 2 Nov 2026 00:00 Gulf (UTC+4) through Sunday
 * 22 Nov 2026 23:59:59 Gulf: three weeks, still `scheduled`.
 * Re-running the seed does not move dates once the season is active, and it
 * does not put a draft zone back to draft if Augusto already activated it.
 */
export const INITIAL_SEASON = {
  name: "Temporada 1",
  startsAt: "2026-11-02 00:00:00+04",
  endsAt: "2026-11-22 23:59:59+04",
  status: "scheduled",
} as const;

const LEAGUE_NAMES: Record<LeagueCode, string> = {
  elite: "Élite",
  advanced: "Avanzado",
  intermediate: "Intermedio",
  starter: "Inicial",
};

export type ZoneSeedInput = {
  slug: string;
  name: string;
  timezone: string;
  h3Resolution: number;
  polygon: PolygonGeometry;
  cells: readonly string[];
};

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function coord(value: number): string {
  if (!Number.isFinite(value)) {
    throw new Error("coordinate is not finite");
  }
  return value.toFixed(8);
}

function formatRing(ring: readonly (readonly [number, number])[]): string {
  if (ring.length < 4) {
    throw new Error("a polygon ring needs at least 4 positions");
  }
  const points = ring.map(([lng, lat]) => `${coord(lng)} ${coord(lat)}`);
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) throw new Error("empty ring");
  if (first !== last) points.push(first);
  return points.join(",\n      ");
}

function polygonWkt(polygon: PolygonGeometry): string {
  if (polygon.type !== "Polygon" || polygon.coordinates.length === 0) {
    throw new Error("zone seed expects a Polygon");
  }
  const rings = polygon.coordinates.map((ring) => `(${formatRing(ring)})`).join(", ");
  return `POLYGON(${rings})`;
}

function pointWkt(lng: number, lat: number): string {
  return `POINT(${coord(lng)} ${coord(lat)})`;
}

function geographyFromWkt(wkt: string): string {
  return `extensions.ST_GeomFromText(${sqlString(wkt)}, 4326)::extensions.geography`;
}

/**
 * The 25 m corridor self-touches at one sharp bend, so the raw ring is an
 * invalid polygon. A zero-distance buffer drops that bowtie and keeps one
 * polygon, which is what `zones.polygon` stores.
 */
function validPolygonGeography(wkt: string): string {
  return `extensions.ST_Buffer(extensions.ST_GeomFromText(${sqlString(wkt)}, 4326), 0)::extensions.geography`;
}

function sqlInt(value: number | null): string {
  return value === null ? "NULL" : String(value);
}

/**
 * Idempotent SQL for the phase-0 zone, the four global leagues and season 1.
 * Geometry comes from the committed polygon and cell list, not from a fresh
 * `polygonToCells` call, so the seed stays byte-stable until those files change.
 */
export function renderInitialSeedSql(zone: ZoneSeedInput): string {
  if (!SLUG.test(zone.slug)) throw new Error(`invalid slug ${zone.slug}`);
  if (!zone.name.trim()) throw new Error("zone name is empty");
  if (!zone.timezone.trim()) throw new Error("timezone is empty");
  if (!Number.isInteger(zone.h3Resolution)) throw new Error("h3 resolution must be an integer");

  const cells = [...zone.cells].sort();
  if (cells.length === 0) throw new Error("zone has no cells");
  const unique = new Set(cells);
  if (unique.size !== cells.length) throw new Error("duplicate h3 index in the cell list");

  const cellRows = cells.map((h3) => {
    assertResolution(h3, zone.h3Resolution);
    const [lng, lat] = cellCenter(h3);
    const boundary = cellPolygon(h3);
    return `    (
      ${sqlString(h3)},
      ${geographyFromWkt(pointWkt(lng, lat))},
      ${geographyFromWkt(polygonWkt(boundary))}
    )`;
  });

  const cellList = cells.map((h3) => `    ${sqlString(h3)}`).join(",\n");

  const leagues = [...LEAGUE_BANDS]
    .sort((a, b) => a.sort - b.sort)
    .map((band) => {
      const name = LEAGUE_NAMES[band.code];
      return `INSERT INTO public.leagues (zone_id, code, name, min_pace_s, max_pace_s, sort)
VALUES (NULL, ${sqlString(band.code)}, ${sqlString(name)}, ${sqlInt(band.minPaceS)}, ${sqlInt(band.maxPaceS)}, ${band.sort})
ON CONFLICT (code) WHERE zone_id IS NULL DO UPDATE SET
  name = EXCLUDED.name,
  min_pace_s = EXCLUDED.min_pace_s,
  max_pace_s = EXCLUDED.max_pace_s,
  sort = EXCLUDED.sort;`;
    })
    .join("\n\n");

  return `-- Generado por \`pnpm seed:sql\`. No editar a mano.
-- Fuentes: supabase/seed/zones/${zone.slug}.geojson y ${zone.slug}.cells.json.
-- ${cells.length} celdas H3 resolución ${zone.h3Resolution}. La zona entra en draft.
-- El pasillo se auto-toca en un recodo; ST_Buffer(..., 0) lo deja en un polígono válido.
-- Volver a ejecutar este archivo no duplica filas, no apaga una zona activa
-- y no mueve las fechas de una temporada que ya no está en scheduled.

INSERT INTO public.zones (slug, name, polygon, h3_res, status, timezone)
VALUES (
  ${sqlString(zone.slug)},
  ${sqlString(zone.name)},
  ${validPolygonGeography(polygonWkt(zone.polygon))},
  ${zone.h3Resolution},
  'draft',
  ${sqlString(zone.timezone)}
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  polygon = EXCLUDED.polygon,
  h3_res = EXCLUDED.h3_res,
  timezone = EXCLUDED.timezone;

DELETE FROM public.zone_cells AS stale
USING public.zones AS zone
WHERE stale.zone_id = zone.id
  AND zone.slug = ${sqlString(zone.slug)}
  AND stale.h3 NOT IN (
${cellList}
  );

INSERT INTO public.zone_cells (zone_id, h3, center, boundary)
SELECT zone.id, cell.h3, cell.center, cell.boundary
FROM public.zones AS zone
CROSS JOIN (
  VALUES
${cellRows.join(",\n")}
) AS cell(h3, center, boundary)
WHERE zone.slug = ${sqlString(zone.slug)}
ON CONFLICT (zone_id, h3) DO UPDATE SET
  center = EXCLUDED.center,
  boundary = EXCLUDED.boundary;

${leagues}

INSERT INTO public.seasons (zone_id, name, starts_at, ends_at, status)
SELECT zone.id, ${sqlString(INITIAL_SEASON.name)}, timestamptz ${sqlString(INITIAL_SEASON.startsAt)}, timestamptz ${sqlString(INITIAL_SEASON.endsAt)}, ${sqlString(INITIAL_SEASON.status)}
FROM public.zones AS zone
WHERE zone.slug = ${sqlString(zone.slug)}
ON CONFLICT (zone_id, name) DO UPDATE SET
  starts_at = EXCLUDED.starts_at,
  ends_at = EXCLUDED.ends_at
WHERE public.seasons.status = 'scheduled';
`;
}
