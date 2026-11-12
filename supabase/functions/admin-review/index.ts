// T-18. Edge Function para moderación del panel /admin.
// Solo accesible por usuarios autenticados con profiles.is_admin = true.

import { createClient } from "npm:@supabase/supabase-js@2.76.1";
import type { LeagueCode } from "../../../packages/core/src/leagues/bands.ts";
import { resolveLeagueForRun } from "../../../packages/core/src/leagues/resolve.ts";
import { bestKmWindow } from "../../../packages/core/src/leagues/window.ts";
import { parseFit } from "../../../packages/core/src/parse/fit.ts";
import { parseGpx } from "../../../packages/core/src/parse/gpx.ts";
import type { RawPoint, Sport } from "../../../packages/core/src/parse/types.ts";
import type { RunSource } from "../../../packages/core/src/runs/source.ts";
import { computeCellEfforts } from "../../../packages/core/src/track/compute.ts";
import { trackHash } from "../../../packages/core/src/track/hash.ts";
import { normalizeActivity } from "../../../packages/core/src/track/normalize.ts";
import { cellsForZone, TRACK_H3_RESOLUTION } from "../../../packages/core/src/zones/cells.ts";
import { jumeirahKiteZone } from "../../../packages/core/src/zones/registry.ts";
import {
  collectUniqueIds,
  normalizeRunFlags,
  normalizeRunSport,
  parseAdminActionBody,
  parseStorageObjectPath,
  subsampleCoordinates,
  validateApprovalWindow,
  type SeasonWindowRow,
} from "./logic.ts";

const QUEUE_LIMIT = 50;

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type AdminProfile = {
  id: string;
  alias: string | null;
  is_admin: boolean;
};

type RunRow = {
  id: string;
  user_id: string;
  zone_id: string;
  season_id: string | null;
  storage_path: string;
  format: string;
  source: string;
  sport: string | null;
  started_at: string | null;
  ended_at: string | null;
  distance_in_zone_m: number | null;
  status: string;
  reject_code: string | null;
  flags: unknown;
  league_id: string | null;
  track_hash: string | null;
  created_at: string;
};

type ReportRow = {
  id: string;
  run_id: string;
  reporter_id: string;
  reason: string;
  status: string;
  created_at: string;
};

type AuditLogRow = {
  id: string;
  admin_id: string | null;
  action: string;
  target_type: string;
  target_id: string;
  reason: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type ParsedTrackResult = { ok: true; points: RawPoint[]; sport?: Sport } | { ok: false };

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== "GET" && request.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !anonKey || !serviceKey) {
    return jsonResponse({ error: "server_misconfigured" }, 500);
  }

  const token = extractBearer(request);
  if (!token) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data: userData, error: authError } = await userClient.auth.getUser(token);
  const callerId = userData.user?.id ?? null;
  if (authError || !callerId) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: adminProfile, error: profileError } = await supabase
    .from("profiles")
    .select("id, alias, is_admin")
    .eq("id", callerId)
    .maybeSingle<AdminProfile>();

  if (profileError) {
    return jsonResponse({ error: "profile_lookup_failed" }, 500);
  }
  if (!adminProfile || adminProfile.is_admin !== true) {
    return jsonResponse({ error: "forbidden" }, 403);
  }

  if (request.method === "GET") {
    return handleGet(supabase);
  }

  return handlePost(request, supabase, adminProfile);
});

async function handleGet(supabase: ReturnType<typeof createClient>) {
  const [runsRes, reportsRes, auditRes] = await Promise.all([
    supabase
      .from("runs")
      .select(
        "id, user_id, zone_id, season_id, storage_path, format, source, sport, started_at, ended_at, distance_in_zone_m, status, reject_code, flags, league_id, track_hash, created_at",
      )
      .eq("status", "review")
      .order("created_at", { ascending: false })
      .limit(QUEUE_LIMIT),
    supabase
      .from("reports")
      .select("id, run_id, reporter_id, reason, status, created_at")
      .in("status", ["open", "reviewing"])
      .order("created_at", { ascending: false })
      .limit(QUEUE_LIMIT),
    supabase
      .from("admin_audit_logs")
      .select("id, admin_id, action, target_type, target_id, reason, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(QUEUE_LIMIT),
  ]);

  if (runsRes.error || reportsRes.error || auditRes.error) {
    return jsonResponse({ error: "queue_load_failed" }, 500);
  }

  const reviewRuns = (runsRes.data as RunRow[] | null) ?? [];
  const reports = (reportsRes.data as ReportRow[] | null) ?? [];
  const auditLogs = (auditRes.data as AuditLogRow[] | null) ?? [];

  const runById = new Map<string, RunRow>();
  for (const run of reviewRuns) {
    runById.set(run.id, run);
  }

  const missingReportRunIds = collectUniqueIds(
    reports.map((report) => (runById.has(report.run_id) ? null : report.run_id)),
  );
  if (missingReportRunIds.length > 0) {
    const { data: extraRuns, error: extraRunsError } = await supabase
      .from("runs")
      .select(
        "id, user_id, zone_id, season_id, storage_path, format, source, sport, started_at, ended_at, distance_in_zone_m, status, reject_code, flags, league_id, track_hash, created_at",
      )
      .in("id", missingReportRunIds);
    if (extraRunsError) {
      return jsonResponse({ error: "report_runs_load_failed" }, 500);
    }
    for (const run of (extraRuns as RunRow[] | null) ?? []) {
      runById.set(run.id, run);
    }
  }

  const allUserIds = collectUniqueIds([
    ...Array.from(runById.values()).map((run) => run.user_id),
    ...reports.map((report) => report.reporter_id),
    ...auditLogs.map((log) => log.admin_id),
  ]);

  const aliasById = new Map<string, string | null>();
  if (allUserIds.length > 0) {
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, alias")
      .in("id", allUserIds);
    if (profilesError) {
      return jsonResponse({ error: "profiles_load_failed" }, 500);
    }
    for (const profile of (profilesData as Array<{ id: string; alias: string | null }> | null) ??
      []) {
      aliasById.set(profile.id, profile.alias ?? null);
    }
  }

  const trackCache = new Map<
    string,
    { coordinates: [number, number][]; trackUnavailable: boolean }
  >();
  const allReferencedRuns = Array.from(runById.values());
  await Promise.all(
    allReferencedRuns.map(async (run) => {
      const parsed = await loadRunTrack(supabase, run);
      if (!parsed.ok) {
        trackCache.set(run.id, { coordinates: [], trackUnavailable: true });
        return;
      }
      const rawCoords = parsed.points.map((point): [number, number] => [point.lon, point.lat]);
      trackCache.set(run.id, {
        coordinates: subsampleCoordinates(rawCoords, 300),
        trackUnavailable: false,
      });
    }),
  );

  const serializeRun = (run: RunRow) => {
    const track = trackCache.get(run.id) ?? { coordinates: [], trackUnavailable: true };
    return {
      id: run.id,
      userId: run.user_id,
      runnerAlias: aliasById.get(run.user_id) ?? null,
      zoneId: run.zone_id,
      seasonId: run.season_id,
      format: run.format,
      source: run.source,
      sport: run.sport,
      startedAt: run.started_at,
      endedAt: run.ended_at,
      distanceInZoneM: run.distance_in_zone_m,
      status: run.status,
      rejectCode: run.reject_code,
      flags: normalizeRunFlags(run.flags),
      createdAt: run.created_at,
      coordinates: track.coordinates,
      trackUnavailable: track.trackUnavailable,
    };
  };

  return jsonResponse({
    runsReview: reviewRuns.map(serializeRun),
    reports: reports.map((report) => {
      const associatedRun = runById.get(report.run_id) ?? null;
      return {
        id: report.id,
        runId: report.run_id,
        reporterId: report.reporter_id,
        reporterAlias: aliasById.get(report.reporter_id) ?? null,
        reason: report.reason,
        status: report.status,
        createdAt: report.created_at,
        run: associatedRun ? serializeRun(associatedRun) : null,
      };
    }),
    auditLogs: auditLogs.map((log) => {
      const metadata =
        log.metadata && typeof log.metadata === "object" && !Array.isArray(log.metadata)
          ? log.metadata
          : {};
      const fallbackAlias =
        typeof metadata.admin_alias === "string" && metadata.admin_alias.trim().length > 0
          ? metadata.admin_alias
          : null;
      return {
        id: log.id,
        adminId: log.admin_id,
        adminAlias: (log.admin_id ? aliasById.get(log.admin_id) : undefined) ?? fallbackAlias,
        action: log.action,
        targetType: log.target_type,
        targetId: log.target_id,
        reason: log.reason,
        metadata,
        createdAt: log.created_at,
      };
    }),
  });
}

async function handlePost(
  request: Request,
  supabase: ReturnType<typeof createClient>,
  adminProfile: AdminProfile,
) {
  const rawBody = await request.json().catch(() => null);
  const parsedBody = parseAdminActionBody(rawBody);
  if (!parsedBody.ok) {
    return jsonResponse({ error: parsedBody.error }, 400);
  }

  const { action, targetId, reason } = parsedBody.value;

  if (action === "approve_run") {
    return handleApproveRun(supabase, adminProfile, targetId, reason);
  }
  if (action === "void_run") {
    return handleVoidRun(supabase, adminProfile, targetId, reason);
  }
  return handleReportAction(supabase, adminProfile, action, targetId, reason);
}

async function handleApproveRun(
  supabase: ReturnType<typeof createClient>,
  adminProfile: AdminProfile,
  runId: string,
  reason: string,
) {
  const { data: run, error: runError } = await supabase
    .from("runs")
    .select(
      "id, user_id, zone_id, season_id, storage_path, format, source, sport, started_at, ended_at, distance_in_zone_m, status, reject_code, flags, league_id, track_hash, created_at",
    )
    .eq("id", runId)
    .maybeSingle<RunRow>();

  if (runError) return jsonResponse({ error: "run_lookup_failed" }, 500);
  if (!run) return jsonResponse({ error: "run_not_found" }, 404);
  if (run.status !== "review") {
    return jsonResponse({ error: "run_not_in_review" }, 409);
  }

  const parsedTrack = await loadRunTrack(supabase, run);
  if (!parsedTrack.ok) {
    return jsonResponse({ error: "track_unavailable" }, 422);
  }

  const polygon = jumeirahKiteZone.polygon;
  if (!polygon) {
    return jsonResponse({ error: "zone_missing_polygon" }, 500);
  }

  const activity = normalizeActivity({
    points: parsedTrack.points,
    source: run.source as RunSource,
    sport: parsedTrack.sport,
    polygon,
  });

  const season = await resolveRunSeason(supabase, run.zone_id, run.season_id);
  const windowCheck = validateApprovalWindow({
    season,
    startedAtMs: activity.startedAt,
    endedAtMs: activity.endedAt,
    runCreatedAt: run.created_at,
  });
  if (!windowCheck.ok || !season) {
    return jsonResponse({ error: windowCheck.ok ? "no_active_season" : windowCheck.code }, 422);
  }

  const startedAtIso = new Date(activity.startedAt as number).toISOString();
  const endedAtIso = new Date(activity.endedAt as number).toISOString();
  const zoneCells = cellsForZone(jumeirahKiteZone);
  const efforts = computeCellEfforts(activity.segments, TRACK_H3_RESOLUTION, zoneCells);
  const refPaceS = bestKmWindow(activity.segments);
  const hash = await trackHash(activity);
  const resolvedSport = normalizeRunSport(parsedTrack.sport, run.sport);

  const resolvedLeagueId = await resolveAndPersistLeague(supabase, run, season.id, refPaceS);
  if (!resolvedLeagueId) {
    return jsonResponse({ error: "league_resolution_failed" }, 500);
  }

  const previousRunSnapshot = {
    status: run.status,
    reject_code: run.reject_code,
    season_id: run.season_id,
    league_id: run.league_id,
    started_at: run.started_at,
    ended_at: run.ended_at,
    distance_in_zone_m: run.distance_in_zone_m,
    sport: run.sport,
    track_hash: run.track_hash,
  };

  const { error: updateRunError } = await supabase
    .from("runs")
    .update({
      status: "accepted",
      reject_code: null,
      season_id: season.id,
      league_id: resolvedLeagueId,
      started_at: startedAtIso,
      ended_at: endedAtIso,
      distance_in_zone_m: activity.distanceM,
      sport: resolvedSport,
      track_hash: hash,
    })
    .eq("id", runId);

  if (updateRunError) {
    return jsonResponse({ error: "run_update_failed" }, 500);
  }

  const { error: applyError } = await supabase.rpc("apply_run", {
    p_run_id: runId,
    p_efforts: efforts,
  });

  if (applyError) {
    await supabase.from("runs").update(previousRunSnapshot).eq("id", runId);
    const isOutOfWindow = applyError.message.toUpperCase().includes("OUT_OF_WINDOW");
    return jsonResponse(
      { error: isOutOfWindow ? "out_of_window" : "apply_run_failed" },
      isOutOfWindow ? 422 : 500,
    );
  }

  const { error: recomputeError } = await supabase.rpc("recompute_season", {
    p_season_id: season.id,
  });
  if (recomputeError) {
    await supabase.from("runs").update(previousRunSnapshot).eq("id", runId);
    return jsonResponse({ error: "recompute_season_failed" }, 500);
  }

  const { data: dismissedReports } = await supabase
    .from("reports")
    .update({ status: "dismissed" })
    .eq("run_id", runId)
    .in("status", ["open", "reviewing"])
    .select("id");

  const dismissedReportIds = ((dismissedReports as Array<{ id: string }> | null) ?? []).map(
    (r) => r.id,
  );

  const { error: auditError } = await supabase.from("admin_audit_logs").insert({
    admin_id: adminProfile.id,
    action: "approve_run",
    target_type: "run",
    target_id: runId,
    reason,
    metadata: {
      admin_alias: adminProfile.alias,
      season_id: season.id,
      efforts_count: efforts.length,
      dismissed_report_ids: dismissedReportIds,
    },
  });

  if (auditError) {
    return jsonResponse({ error: "audit_log_failed" }, 500);
  }

  return jsonResponse({ ok: true, action: "approve_run", targetId: runId });
}

async function handleVoidRun(
  supabase: ReturnType<typeof createClient>,
  adminProfile: AdminProfile,
  runId: string,
  reason: string,
) {
  const { data: run, error: runError } = await supabase
    .from("runs")
    .select("id, season_id, status, reject_code")
    .eq("id", runId)
    .maybeSingle<{
      id: string;
      season_id: string | null;
      status: string;
      reject_code: string | null;
    }>();

  if (runError) return jsonResponse({ error: "run_lookup_failed" }, 500);
  if (!run) return jsonResponse({ error: "run_not_found" }, 404);
  if (run.status === "voided") {
    return jsonResponse({ error: "run_already_voided" }, 409);
  }

  const { error: updateError } = await supabase
    .from("runs")
    .update({ status: "voided", reject_code: null })
    .eq("id", runId);

  if (updateError) {
    return jsonResponse({ error: "run_update_failed" }, 500);
  }

  let recomputed = false;
  if (run.season_id) {
    const { error: recomputeError } = await supabase.rpc("recompute_season", {
      p_season_id: run.season_id,
    });
    if (recomputeError) {
      await supabase
        .from("runs")
        .update({ status: run.status, reject_code: run.reject_code })
        .eq("id", runId);
      return jsonResponse({ error: "recompute_season_failed" }, 500);
    }
    recomputed = true;
  }

  const { data: resolvedReports } = await supabase
    .from("reports")
    .update({ status: "resolved" })
    .eq("run_id", runId)
    .in("status", ["open", "reviewing"])
    .select("id");

  const resolvedReportIds = ((resolvedReports as Array<{ id: string }> | null) ?? []).map(
    (r) => r.id,
  );

  const { error: auditError } = await supabase.from("admin_audit_logs").insert({
    admin_id: adminProfile.id,
    action: "void_run",
    target_type: "run",
    target_id: runId,
    reason,
    metadata: {
      admin_alias: adminProfile.alias,
      previous_status: run.status,
      season_id: run.season_id,
      recomputed,
      resolved_report_ids: resolvedReportIds,
    },
  });

  if (auditError) {
    return jsonResponse({ error: "audit_log_failed" }, 500);
  }

  return jsonResponse({ ok: true, action: "void_run", targetId: runId });
}

async function handleReportAction(
  supabase: ReturnType<typeof createClient>,
  adminProfile: AdminProfile,
  action: "resolve_report" | "dismiss_report",
  reportId: string,
  reason: string,
) {
  const { data: report, error: reportError } = await supabase
    .from("reports")
    .select("id, run_id, status")
    .eq("id", reportId)
    .maybeSingle<{ id: string; run_id: string; status: string }>();

  if (reportError) return jsonResponse({ error: "report_lookup_failed" }, 500);
  if (!report) return jsonResponse({ error: "report_not_found" }, 404);
  if (report.status !== "open" && report.status !== "reviewing") {
    return jsonResponse({ error: "report_already_closed" }, 409);
  }

  const nextStatus = action === "resolve_report" ? "resolved" : "dismissed";
  const { error: updateError } = await supabase
    .from("reports")
    .update({ status: nextStatus })
    .eq("id", reportId);

  if (updateError) {
    return jsonResponse({ error: "report_update_failed" }, 500);
  }

  const { error: auditError } = await supabase.from("admin_audit_logs").insert({
    admin_id: adminProfile.id,
    action,
    target_type: "report",
    target_id: reportId,
    reason,
    metadata: {
      admin_alias: adminProfile.alias,
      run_id: report.run_id,
    },
  });

  if (auditError) {
    return jsonResponse({ error: "audit_log_failed" }, 500);
  }

  return jsonResponse({ ok: true, action, targetId: reportId });
}

async function loadRunTrack(
  supabase: ReturnType<typeof createClient>,
  run: { storage_path: string; format: string },
): Promise<ParsedTrackResult> {
  try {
    const objectPath = parseStorageObjectPath(run.storage_path);
    const { data, error } = await supabase.storage.from("runs-raw").download(objectPath);
    if (error || !data) return { ok: false };

    if (run.format === "fit") {
      const parsed = parseFit(new Uint8Array(await data.arrayBuffer()));
      return { ok: true, points: parsed.points, sport: parsed.sport };
    }

    const parsed = parseGpx(await data.text());
    return { ok: true, points: parsed.points, sport: parsed.sport };
  } catch {
    return { ok: false };
  }
}

async function resolveRunSeason(
  supabase: ReturnType<typeof createClient>,
  zoneId: string,
  seasonId: string | null,
): Promise<SeasonWindowRow | null> {
  if (seasonId) {
    const { data } = await supabase
      .from("seasons")
      .select("id, status, starts_at, ends_at")
      .eq("id", seasonId)
      .eq("zone_id", zoneId)
      .maybeSingle<SeasonWindowRow>();
    return data ?? null;
  }

  const { data } = await supabase
    .from("seasons")
    .select("id, status, starts_at, ends_at")
    .eq("zone_id", zoneId)
    .eq("status", "active")
    .maybeSingle<SeasonWindowRow>();
  return data ?? null;
}

async function resolveAndPersistLeague(
  supabase: ReturnType<typeof createClient>,
  run: RunRow,
  seasonId: string,
  refPaceS: number | null,
): Promise<string | null> {
  const nowIso = new Date().toISOString();
  const { data: currentRow } = await supabase
    .from("user_leagues")
    .select("league_id, leagues(code)")
    .eq("user_id", run.user_id)
    .eq("season_id", seasonId)
    .lte("valid_from", nowIso)
    .order("valid_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  const rawJoin = (
    currentRow as { league_id?: string; leagues?: { code?: string } | { code?: string }[] } | null
  )?.leagues;
  const rawCode = Array.isArray(rawJoin) ? rawJoin[0]?.code : rawJoin?.code;
  const currentCode: LeagueCode | null =
    rawCode === "elite" ||
    rawCode === "advanced" ||
    rawCode === "intermediate" ||
    rawCode === "starter"
      ? rawCode
      : null;
  const currentLeagueId = (currentRow as { league_id?: string } | null)?.league_id ?? null;

  if (refPaceS !== null) {
    const decision = resolveLeagueForRun(currentCode, refPaceS);
    const targetLeagueId = await leagueIdForCode(supabase, decision.league);
    if (!targetLeagueId) return null;

    if (decision.reason === "provisional" || decision.reason === "promotion") {
      const { error: insertError } = await supabase.from("user_leagues").insert({
        user_id: run.user_id,
        season_id: seasonId,
        league_id: targetLeagueId,
        ref_pace_s: refPaceS,
        reason: decision.reason,
      });
      if (insertError) {
        console.error(
          JSON.stringify({
            run_id: run.id,
            error: "admin_league_insert_failed",
            code: insertError.code,
          }),
        );
      }
    }

    return targetLeagueId;
  }

  if (currentLeagueId) return currentLeagueId;
  if (run.league_id) return run.league_id;
  return leagueIdForCode(supabase, "starter");
}

async function leagueIdForCode(
  supabase: ReturnType<typeof createClient>,
  code: LeagueCode,
): Promise<string | null> {
  const { data } = await supabase
    .from("leagues")
    .select("id")
    .eq("code", code)
    .is("zone_id", null)
    .maybeSingle<{ id: string }>();
  return data?.id ?? null;
}

function extractBearer(request: Request): string | null {
  const header = request.headers.get("Authorization");
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  return match?.[1] ?? null;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "content-type": "application/json",
    },
  });
}
