// T-13. Thin Edge Function. Not deployed: review it, then deploy by hand.
// The decision lives in packages/core `planRun`. This file only loads the row,
// reads the file or the supplied points, and writes status / apply_run.

import { createClient } from "npm:@supabase/supabase-js@2.76.1";
import { isTrackParseError } from "../../../packages/core/src/parse/errors.ts";
import { parseFit } from "../../../packages/core/src/parse/fit.ts";
import { parseGpx } from "../../../packages/core/src/parse/gpx.ts";
import type { RawPoint } from "../../../packages/core/src/parse/types.ts";
import type { LeagueCode } from "../../../packages/core/src/leagues/bands.ts";
import { planRun } from "../../../packages/core/src/runs/process.ts";
import type { RunSource } from "../../../packages/core/src/runs/source.ts";
import { cellsForZone, TRACK_H3_RESOLUTION } from "../../../packages/core/src/zones/cells.ts";
import { jumeirahKiteZone } from "../../../packages/core/src/zones/registry.ts";

type Body = { run_id?: string; points?: RawPoint[] };

const terminal = new Set(["accepted", "rejected", "review", "voided"]);

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "method" }, 405);
  const body = (await request.json().catch(() => null)) as Body | null;
  const runId = body?.run_id;
  if (!runId) return json({ error: "run_id" }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  const { data: run, error } = await supabase
    .from("runs")
    .select(
      "id, user_id, zone_id, season_id, storage_path, file_sha256, format, source, sport, status, reject_code, league_id",
    )
    .eq("id", runId)
    .maybeSingle();
  if (error || !run) return json({ error: "run_not_found" }, 404);
  if (terminal.has(run.status)) {
    return json({ ok: true, idempotent: true, status: run.status, reject_code: run.reject_code });
  }

  const { count } = await supabase
    .from("cell_efforts")
    .select("id", { count: "exact", head: true })
    .eq("run_id", runId);
  if ((count ?? 0) > 0) {
    await supabase.from("runs").update({ status: "accepted" }).eq("id", runId);
    return json({ ok: true, idempotent: true, status: "accepted" });
  }

  const parsed = await readActivity(supabase, run, body?.points);
  if ("error" in parsed) return json({ error: parsed.error }, 422);

  const polygon = jumeirahKiteZone.polygon;
  if (!polygon || run.zone_id == null) return json({ error: "zone" }, 422);

  const currentLeague = await currentLeagueCode(supabase, run.user_id, run.season_id);
  const plan = await planRun({
    points: parsed.points,
    source: run.source as RunSource,
    sport: parsed.sport,
    polygon,
    zoneCells: cellsForZone(jumeirahKiteZone),
    resolution: TRACK_H3_RESOLUTION,
    fileSha256: run.file_sha256,
    context: {
      now: Date.now(),
      uploadedAt: Date.now(),
      userId: run.user_id,
      ownFileHashes: [],
      ownRuns: [],
      knownTracks: [],
      runsToday: 0,
    },
    currentLeague,
    parseError: parsed.parseError,
  });

  const leagueId = plan.league ? await leagueIdFor(supabase, plan.league) : run.league_id;
  const { error: updateError } = await supabase
    .from("runs")
    .update({
      status: plan.status,
      reject_code: plan.rejectCode,
      league_id: leagueId,
      track_hash: plan.trackHash,
      flags: { flags: plan.flags },
    })
    .eq("id", runId);
  if (updateError) return json({ error: "update_failed" }, 500);

  if (
    plan.leagueReason &&
    plan.leagueReason !== "held" &&
    plan.refPaceS &&
    leagueId &&
    run.season_id
  ) {
    await supabase.from("user_leagues").insert({
      user_id: run.user_id,
      season_id: run.season_id,
      league_id: leagueId,
      ref_pace_s: plan.refPaceS,
      reason: plan.leagueReason,
    });
  }

  if (plan.apply) {
    const { error: applyError } = await supabase.rpc("apply_run", {
      p_run_id: runId,
      p_efforts: plan.efforts,
    });
    if (applyError && !applyError.message.toLowerCase().includes("already applied")) {
      console.error(JSON.stringify({ run_id: runId, error: "apply_failed" }));
      return json({ error: "apply_failed" }, 500);
    }
  }

  return json({
    ok: true,
    idempotent: false,
    status: plan.status,
    reject_code: plan.rejectCode,
    apply: plan.apply,
  });
});

async function readActivity(
  supabase: ReturnType<typeof createClient>,
  run: { storage_path: string; format: string },
  points: RawPoint[] | undefined,
): Promise<
  | { points: RawPoint[]; sport?: "running" | "cycling" | "other"; parseError: null }
  | { points: RawPoint[]; sport?: "running" | "cycling" | "other"; parseError: "NO_TIMESTAMPS" }
  | { error: "read_failed" }
> {
  try {
    if (points) return finish(points, undefined);
    const path = run.storage_path.replace(/^runs-raw\//, "");
    const { data, error } = await supabase.storage.from("runs-raw").download(path);
    if (error || !data) return { error: "read_failed" };
    if (run.format === "fit") return finishFit(new Uint8Array(await data.arrayBuffer()));
    return finishGpx(await data.text());
  } catch {
    return { error: "read_failed" };
  }
}

function finishGpx(text: string) {
  try {
    return finish(undefined, parseGpx(text));
  } catch (error) {
    if (isTrackParseError(error) && error.code === "NO_TIMESTAMPS") {
      return { points: [], parseError: "NO_TIMESTAMPS" as const };
    }
    return { error: "read_failed" as const };
  }
}

function finishFit(bytes: Uint8Array) {
  try {
    return finish(undefined, parseFit(bytes));
  } catch (error) {
    if (isTrackParseError(error) && error.code === "NO_TIMESTAMPS") {
      return { points: [], parseError: "NO_TIMESTAMPS" as const };
    }
    return { error: "read_failed" as const };
  }
}

function finish(
  points: RawPoint[] | undefined,
  parsed: { points: RawPoint[]; sport?: "running" | "cycling" | "other" } | undefined,
) {
  if (points) return { points, parseError: null as const };
  if (!parsed) return { error: "read_failed" as const };
  return { points: parsed.points, sport: parsed.sport, parseError: null as const };
}

async function currentLeagueCode(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  seasonId: string | null,
): Promise<LeagueCode | null> {
  if (!seasonId) return null;
  const { data } = await supabase
    .from("user_leagues")
    .select("league_id, leagues(code)")
    .eq("user_id", userId)
    .eq("season_id", seasonId)
    .order("valid_from", { ascending: false })
    .limit(1)
    .maybeSingle();
  const code = (data as { leagues?: { code?: string } | { code?: string }[] } | null)?.leagues;
  const value = Array.isArray(code) ? code[0]?.code : code?.code;
  if (
    value === "elite" ||
    value === "advanced" ||
    value === "intermediate" ||
    value === "starter"
  ) {
    return value;
  }
  return null;
}

async function leagueIdFor(supabase: ReturnType<typeof createClient>, code: LeagueCode) {
  const { data } = await supabase
    .from("leagues")
    .select("id")
    .eq("code", code)
    .is("zone_id", null)
    .maybeSingle();
  return data?.id ?? null;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
