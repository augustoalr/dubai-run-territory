import { cellCenter, haversineMeters, type LngLat } from "@dubai-run/core";
import type { TerritoryCell, TerritoryStats } from "./types";

/** Derive 2-letter initials from a runner alias without assuming locale text. */
export function getInitials(alias: string | null | undefined): string {
  if (!alias) return "—";
  const cleaned = alias.trim().replace(/[^a-zA-Z0-9.\-_]/g, "");
  const parts = cleaned.split(/[.\-_]/).filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0]?.[0] ?? "";
    const second = parts[1]?.[0] ?? "";
    return (first + second).toUpperCase() || "??";
  }
  return cleaned.slice(0, 2).toUpperCase() || "??";
}

/** Distance projected along a zone centerline so cells sort consistently along the track. */
export function alongTrack(point: LngLat, line: readonly LngLat[]): number {
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestAlong = 0;
  let walked = 0;
  for (let i = 1; i < line.length; i += 1) {
    const start = line[i - 1];
    const end = line[i];
    if (!start || !end) continue;
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const length2 = dx * dx + dy * dy || 1;
    const t = Math.max(
      0,
      Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / length2),
    );
    const projected: LngLat = [start[0] + t * dx, start[1] + t * dy];
    const distance = haversineMeters(point, projected);
    const segment = haversineMeters(start, end);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestAlong = walked + segment * t;
    }
    walked += segment;
  }
  return bestAlong;
}

/** Sort H3 cell identifiers along a track centerline. */
export function sortCellsAlongCenterline(
  cellIds: readonly string[],
  centerline: readonly LngLat[],
): string[] {
  return [...cellIds].sort(
    (left, right) =>
      alongTrack(cellCenter(left), centerline) - alongTrack(cellCenter(right), centerline),
  );
}

/** Aggregate TerritoryCell status counts. */
export function computeTerritoryStats(cells: readonly TerritoryCell[]): TerritoryStats {
  return cells.reduce<TerritoryStats>(
    (acc, cell) => {
      acc[cell.status] += 1;
      acc.total += 1;
      return acc;
    },
    { mine: 0, threatened: 0, rival: 0, free: 0, total: 0 },
  );
}
