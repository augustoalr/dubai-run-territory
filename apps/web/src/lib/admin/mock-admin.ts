import type { AdminLoadResult } from "./types";

const SAMPLE_TRACK_COORDS_A: [number, number][] = [
  [55.2032, 25.1518],
  [55.2044, 25.1531],
  [55.2058, 25.1546],
  [55.2071, 25.1561],
  [55.2085, 25.1578],
  [55.2098, 25.1594],
];

const SAMPLE_TRACK_COORDS_B: [number, number][] = [
  [55.1995, 25.1476],
  [55.2008, 25.1489],
  [55.2022, 25.1503],
  [55.2036, 25.1519],
  [55.2049, 25.1535],
];

export function buildSampleAdminData(): Extract<AdminLoadResult, { status: "sample" }> {
  const sampleReportedRun = {
    id: "22222222-2222-4222-8222-222222222202",
    userId: "aaaa1111-1111-4111-8111-111111111102",
    runnerAlias: "MarinaFalcon",
    zoneId: "00000000-0000-4000-8000-000000000001",
    seasonId: "00000000-0000-4000-8000-000000000010",
    format: "fit",
    source: "garmin",
    sport: "running",
    startedAt: "2026-11-11T05:40:00.000Z",
    endedAt: "2026-11-11T06:05:00.000Z",
    distanceInZoneM: 4820,
    status: "accepted",
    rejectCode: null,
    flags: ["GAP"],
    createdAt: "2026-11-11T06:15:00.000Z",
    coordinates: SAMPLE_TRACK_COORDS_B,
    trackUnavailable: false,
  };

  return {
    status: "sample",
    isSampleData: true,
    error: null,
    runsReview: [
      {
        id: "11111111-1111-4111-8111-111111111101",
        userId: "aaaa1111-1111-4111-8111-111111111101",
        runnerAlias: "KiteSprinter",
        zoneId: "00000000-0000-4000-8000-000000000001",
        seasonId: "00000000-0000-4000-8000-000000000010",
        format: "gpx",
        source: "upload",
        sport: "running",
        startedAt: "2026-11-11T14:10:00.000Z",
        endedAt: "2026-11-11T14:36:00.000Z",
        distanceInZoneM: 5210,
        status: "review",
        rejectCode: "IMPOSSIBLE_PACE",
        flags: ["SPIKE", "JUMP"],
        createdAt: "2026-11-11T15:00:00.000Z",
        coordinates: SAMPLE_TRACK_COORDS_A,
        trackUnavailable: false,
      },
    ],
    reports: [
      {
        id: "33333333-3333-4333-8333-333333333301",
        runId: sampleReportedRun.id,
        reporterId: "aaaa1111-1111-4111-8111-111111111103",
        reporterAlias: "JumeirahPace",
        reason: "Ritmo constante por encima de la velocidad habitual en el tramo norte.",
        status: "open",
        createdAt: "2026-11-11T16:20:00.000Z",
        run: sampleReportedRun,
      },
    ],
    auditLogs: [
      {
        id: "44444444-4444-4444-8444-444444444401",
        adminId: "aaaa1111-1111-4111-8111-111111111199",
        adminAlias: "ModAdmin",
        action: "dismiss_report",
        targetType: "report",
        targetId: "33333333-3333-4333-8333-333333333300",
        reason: "Cadencia y pulso consistentes con series en pista.",
        metadata: { admin_alias: "ModAdmin" },
        createdAt: "2026-11-10T18:05:00.000Z",
      },
    ],
  };
}
