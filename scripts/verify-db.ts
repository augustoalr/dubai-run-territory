import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { splitSql } from "../packages/core/src/db/sql-split.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const connectionString =
  process.env.DATABASE_URL ?? "postgres://territory:territory@127.0.0.1:5432/territory";

const userA = "11111111-1111-4111-8111-111111111111";
const userB = "22222222-2222-4222-8222-222222222222";

function assertLocalDatabase(value: string): void {
  const host = new URL(value).hostname;
  if (host !== "localhost" && host !== "127.0.0.1" && host !== "::1") {
    throw new Error(`db:verify solo corre contra localhost (recibí ${host}).`);
  }
}

function preview(statement: string): string {
  return statement.slice(0, 200).replace(/\s+/g, " ");
}

function asNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  throw new Error(`expected a number, got ${String(value)}`);
}

function errorText(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const sql =
    typeof error === "object" && error !== null && "sql" in error
      ? String((error as { sql?: string }).sql ?? "")
      : "";
  return sql ? `${message}\nSQL: ${preview(sql)}` : message;
}

function errorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: string }).code)
    : undefined;
}

async function expectFailure(
  run: () => Promise<unknown>,
  code: string,
  messageIncludes: string,
): Promise<void> {
  try {
    await run();
  } catch (error) {
    if (errorCode(error) !== code || !errorText(error).toLowerCase().includes(messageIncludes)) {
      throw new Error(
        `expected ${code} containing "${messageIncludes}", got ${errorCode(error)}: ${errorText(error)}`,
      );
    }
    return;
  }
  throw new Error(`expected SQLSTATE ${code}`);
}

async function main(): Promise<void> {
  assertLocalDatabase(connectionString);
  const client = await connect(connectionString);
  const query = client.query.bind(client);
  client.query = ((...args: Parameters<pg.Client["query"]>) => {
    const pending = query(...args);
    return Promise.resolve(pending).catch((error: unknown) => {
      if (typeof error === "object" && error !== null && typeof args[0] === "string") {
        (error as { sql?: string }).sql = args[0];
      }
      throw error;
    });
  }) as pg.Client["query"];
  console.log("applying migrations");
  await resetDatabase(client);
  await applyFile(client, join(root, "supabase/tests/harness.sql"));
  const migrations = readdirSync(join(root, "supabase/migrations"))
    .filter((name) => name.endsWith(".sql"))
    .sort();
  for (const name of migrations) {
    await applyFile(client, join(root, "supabase/migrations", name));
  }
  const seedPath = join(root, "supabase/migrations/20261027130000_seed_jumeirah_kite.sql");
  await applyFile(client, seedPath);

  const zone = await one<{ id: string; status: string }>(
    client,
    "SELECT id, status FROM public.zones WHERE slug = 'jumeirah-kite'",
  );
  if (zone.status !== "draft") throw new Error(`zone status ${zone.status}`);
  await expectCount(client, "public.zone_cells", 99);
  await expectCount(client, "public.leagues", 4);
  await expectCount(client, "public.seasons", 1);
  const invalidCells = await one<{ n: number }>(
    client,
    `SELECT count(*)::int AS n
     FROM public.zone_cells
     WHERE NOT extensions.ST_IsValid(boundary::extensions.geometry)`,
  );
  if (invalidCells.n !== 0) throw new Error(`${invalidCells.n} invalid cell boundaries`);
  const zoneValid = await one<{ ok: boolean; srid: number }>(
    client,
    `SELECT extensions.ST_IsValid(polygon::extensions.geometry) AS ok,
            extensions.ST_SRID(polygon::extensions.geometry)::int AS srid
     FROM public.zones WHERE slug = 'jumeirah-kite'`,
  );
  if (!zoneValid.ok || zoneValid.srid !== 4326) {
    throw new Error(`zone polygon invalid or SRID ${zoneValid.srid}`);
  }

  console.log("checking advisor fixes");
  const missingIndexes = await client.query<{ table_name: string }>(
    `WITH wanted AS (
       SELECT * FROM (VALUES
         ('cell_efforts', ARRAY['season_id']::text[]),
         ('cell_ownership', ARRAY['zone_id', 'h3']::text[]),
         ('daily_points', ARRAY['league_id']::text[]),
         ('daily_points', ARRAY['user_id']::text[]),
         ('runs', ARRAY['season_id']::text[]),
         ('user_leagues', ARRAY['season_id']::text[])
       ) AS v(table_name, cols)
     )
     SELECT w.table_name
     FROM wanted w
     WHERE NOT EXISTS (
       SELECT 1
       FROM pg_index i
       JOIN pg_class t ON t.oid = i.indrelid
       JOIN pg_namespace n ON n.oid = t.relnamespace
       WHERE n.nspname = 'public'
         AND t.relname = w.table_name
         AND i.indisvalid
         AND (
           SELECT array_agg(a.attname::text ORDER BY u.ord)
           FROM unnest(string_to_array(i.indkey::text, ' ')::int[]) WITH ORDINALITY AS u(attnum, ord)
           JOIN pg_attribute a
             ON a.attrelid = t.oid
            AND a.attnum = u.attnum
           WHERE u.ord <= cardinality(w.cols)
             AND u.attnum > 0
         ) = w.cols
     )`,
  );
  if (missingIndexes.rows.length !== 0) {
    throw new Error(
      `foreign keys still lack a covering index: ${missingIndexes.rows.map((row) => row.table_name).join(", ")}`,
    );
  }
  const slowPolicies = await one<{ n: number }>(
    client,
    `SELECT count(*)::int AS n
     FROM pg_policies
     WHERE schemaname = 'public'
       AND policyname IN (
         'profiles_update_own',
         'user_leagues_select_own',
         'runs_select_own',
         'runs_insert_own_upload',
         'cell_efforts_select_own',
         'ownership_events_select_involved',
         'reports_select_own',
         'reports_insert_own'
       )
       AND (
         (qual IS NOT NULL AND qual ILIKE '%auth.uid()%' AND qual NOT ILIKE '%select auth.uid()%')
         OR (
           with_check IS NOT NULL
           AND with_check ILIKE '%auth.uid()%'
           AND with_check NOT ILIKE '%select auth.uid()%'
         )
       )`,
  );
  if (slowPolicies.n !== 0)
    throw new Error(`${slowPolicies.n} policies still call auth.uid() per row`);
  const wrapped = await one<{ n: number }>(
    client,
    `SELECT count(*)::int AS n
     FROM pg_policies
     WHERE schemaname = 'public'
       AND policyname IN (
         'profiles_update_own',
         'user_leagues_select_own',
         'runs_select_own',
         'runs_insert_own_upload',
         'cell_efforts_select_own',
         'ownership_events_select_involved',
         'reports_select_own',
         'reports_insert_own'
       )
       AND (
         coalesce(qual, '') ILIKE '%select auth.uid()%'
         OR coalesce(with_check, '') ILIKE '%select auth.uid()%'
       )`,
  );
  if (wrapped.n !== 8) throw new Error(`expected 8 wrapped policies, saw ${wrapped.n}`);
  const adminFn = await one<{
    public_gone: boolean;
    anon_exec: boolean;
    auth_exec: boolean;
    anon_usage: boolean;
    auth_usage: boolean;
  }>(
    client,
    `SELECT to_regprocedure('public.is_admin()') IS NULL AS public_gone,
            has_function_privilege('anon', 'private.is_admin()', 'EXECUTE') AS anon_exec,
            has_function_privilege('authenticated', 'private.is_admin()', 'EXECUTE') AS auth_exec,
            has_schema_privilege('anon', 'private', 'USAGE') AS anon_usage,
            has_schema_privilege('authenticated', 'private', 'USAGE') AS auth_usage`,
  );
  if (!adminFn.public_gone) throw new Error("public.is_admin() is still an RPC");
  if (adminFn.anon_exec || adminFn.anon_usage) throw new Error("anon can reach private.is_admin()");
  if (!adminFn.auth_exec || !adminFn.auth_usage) {
    throw new Error("authenticated cannot execute private.is_admin() from RLS");
  }

  console.log("checking RLS");
  await client.query("INSERT INTO auth.users (id) VALUES ($1::uuid), ($2::uuid)", [userA, userB]);
  await client.query("UPDATE public.profiles SET alias = 'runner_a' WHERE id = $1::uuid", [userA]);
  await client.query("UPDATE public.profiles SET alias = 'runner_b' WHERE id = $1::uuid", [userB]);

  const season = await one<{ id: string }>(
    client,
    "SELECT id FROM public.seasons WHERE name = 'Temporada 1'",
  );
  const league = await one<{ id: string }>(
    client,
    "SELECT id FROM public.leagues WHERE code = 'intermediate'",
  );
  const cell = await one<{ h3: string }>(
    client,
    "SELECT h3 FROM public.zone_cells ORDER BY h3 LIMIT 1",
  );

  const runA = await one<{ id: string }>(
    client,
    `INSERT INTO public.runs (
       user_id, zone_id, season_id, storage_path, file_sha256, format, source,
       external_activity_id, status, started_at, ended_at
     ) VALUES (
       $1, $2, $3, 'server/garmin/a.fit', $4, 'fit', 'garmin', 'act-100',
       'accepted', '2026-11-02 06:00:00+04', '2026-11-02 07:00:00+04'
     ) RETURNING id`,
    [userA, zone.id, season.id, "a".repeat(64)],
  );
  const runB = await one<{ id: string }>(
    client,
    `INSERT INTO public.runs (
       user_id, zone_id, season_id, storage_path, file_sha256, format, source, status
     ) VALUES (
       $1, $2, $3, 'server/upload/b.gpx', $4, 'gpx', 'upload', 'accepted'
     ) RETURNING id`,
    [userB, zone.id, season.id, "b".repeat(64)],
  );
  const effort = await one<{ id: string }>(
    client,
    `INSERT INTO public.cell_efforts (
       run_id, user_id, zone_id, season_id, league_id, h3, crossed_at, pace_s,
       window_start_m, window_end_m
     ) VALUES (
       $1, $2, $3, $4, $5, $6, '2026-11-02 06:15:00+04', 330, 100, 1100
     ) RETURNING id`,
    [runA.id, userA, zone.id, season.id, league.id, cell.h3],
  );
  await client.query(
    `INSERT INTO public.cell_ownership (
       zone_id, season_id, league_id, h3, owner_id, effort_id, pace_s, achieved_at
     ) VALUES ($1, $2, $3, $4, $5, $6, 330, '2026-11-02 06:15:00+04')`,
    [zone.id, season.id, league.id, cell.h3, userA, effort.id],
  );
  await client.query(
    `INSERT INTO public.daily_points (season_id, league_id, user_id, day, cells_owned, points)
     VALUES ($1, $2, $3, '2026-11-02', 1, 1)`,
    [season.id, league.id, userA],
  );
  await client.query(
    `INSERT INTO public.provider_connections (user_id, provider, tokens)
     VALUES ($1, 'garmin', '{"access_token":"secret-access","refresh_token":"secret-refresh"}'::jsonb)`,
    [userA],
  );

  await expectFailure(
    () =>
      client.query(
        `INSERT INTO public.runs (user_id, zone_id, storage_path, file_sha256, format, source)
         VALUES ($1, $2, 'server/x.gpx', $3, 'gpx', 'strava')`,
        [userA, zone.id, "c".repeat(64)],
      ),
    "22P02",
    "strava",
  );
  await expectFailure(
    () =>
      client.query(
        `INSERT INTO public.provider_connections (user_id, provider, tokens)
         VALUES ($1, 'strava', '{}'::jsonb)`,
        [userA],
      ),
    "22P02",
    "strava",
  );

  await client.query("BEGIN");
  await expectFailure(
    () =>
      client.query(
        `INSERT INTO public.runs (
           user_id, zone_id, storage_path, file_sha256, format, source, external_activity_id
         ) VALUES ($1, $2, 'server/garmin/dup.fit', $3, 'fit', 'garmin', 'act-100')`,
        [userB, zone.id, "d".repeat(64)],
      ),
    "23505",
    "runs_source_external_activity",
  );
  await client.query("ROLLBACK");

  await client.query(
    `INSERT INTO public.runs (
       user_id, zone_id, storage_path, file_sha256, format, source, external_activity_id, status
     ) VALUES ($1, $2, 'server/polar/a.fit', $3, 'fit', 'polar', 'act-100', 'accepted')`,
    [userB, zone.id, "e".repeat(64)],
  );

  await asUser(client, userA, "rollback", async () => {
    await expectFailure(
      () =>
        client.query(
          `INSERT INTO public.runs (user_id, zone_id, storage_path, file_sha256, format)
           VALUES ($1, $2, $3, $4, 'gpx')`,
          [userA, zone.id, `runs-raw/${userA}/early.gpx`, "1".repeat(64)],
        ),
      "42501",
      "row-level security",
    );
  });

  await client.query("UPDATE public.zones SET status = 'active' WHERE id = $1", [zone.id]);

  await asUser(client, userA, "commit", async () => {
    const seen = await client.query("SELECT id FROM public.runs");
    if (seen.rows.length !== 1) throw new Error(`A should see 1 run, saw ${seen.rows.length}`);
    const efforts = await client.query("SELECT id FROM public.cell_efforts");
    if (efforts.rows.length !== 1) throw new Error("A should see their cell effort");
    const aliases = await client.query("SELECT alias FROM public.profiles ORDER BY alias");
    if (aliases.rows.length !== 2) throw new Error("aliases should be public");
    const admin = await client.query("SELECT private.is_admin() AS ok");
    if (admin.rows[0]?.ok !== false) throw new Error("A is not an admin yet");
    await client.query("UPDATE public.profiles SET alias = 'ana' WHERE id = $1", [userA]);
    const stolen = await client.query("UPDATE public.profiles SET alias = 'bob' WHERE id = $1", [
      userB,
    ]);
    if (stolen.rowCount !== 0) throw new Error("A updated B's alias");
    await client.query(
      `INSERT INTO public.runs (user_id, zone_id, storage_path, file_sha256, format)
       VALUES ($1, $2, $3, $4, 'gpx')`,
      [userA, zone.id, `runs-raw/${userA}/ok.gpx`, "2".repeat(64)],
    );
  });
  // A failed statement aborts the transaction, so each denial sits on its own.
  await asUser(client, userA, "rollback", async () => {
    await expectFailure(
      () => client.query("SELECT is_admin FROM public.profiles"),
      "42501",
      "permission denied",
    );
  });
  await asUser(client, userA, "rollback", async () => {
    await expectFailure(
      () =>
        client.query(
          `INSERT INTO public.runs (user_id, zone_id, storage_path, file_sha256, format, source)
           VALUES ($1, $2, $3, $4, 'fit', 'garmin')`,
          [userA, zone.id, `runs-raw/${userA}/nope.fit`, "3".repeat(64)],
        ),
      "42501",
      "row-level security",
    );
  });
  await asUser(client, userA, "rollback", async () => {
    await expectFailure(
      () =>
        client.query(
          `INSERT INTO public.runs (
             user_id, zone_id, storage_path, file_sha256, format, external_activity_id
           ) VALUES ($1, $2, $3, $4, 'gpx', 'act-9')`,
          [userA, zone.id, `runs-raw/${userA}/ext.gpx`, "4".repeat(64)],
        ),
      "42501",
      "row-level security",
    );
  });
  await asUser(client, userA, "rollback", async () => {
    await expectFailure(
      () => client.query("SELECT tokens FROM public.provider_connections"),
      "42501",
      "permission denied",
    );
  });

  await asUser(client, userB, "rollback", async () => {
    const seen = await client.query("SELECT id FROM public.runs");
    const ids = new Set(seen.rows.map((row: { id: string }) => row.id));
    if (ids.has(runA.id) || !ids.has(runB.id)) {
      throw new Error("B can see another runner's run or missed their own");
    }
    const efforts = await client.query("SELECT id FROM public.cell_efforts");
    if (efforts.rows.length !== 0) throw new Error("B can see A's cell efforts");
  });

  await asRole(client, "anon", null, "rollback", async () => {
    const cells = await client.query("SELECT count(*)::int AS n FROM public.zone_cells");
    if (asNumber(cells.rows[0]?.n) !== 99) throw new Error("anon cannot read zone cells");
    const owned = await client.query("SELECT owner_id FROM public.cell_ownership");
    if (owned.rows.length !== 1) throw new Error("anon cannot read cell ownership");
    const points = await client.query("SELECT points FROM public.daily_points");
    if (points.rows.length !== 1) throw new Error("anon cannot read daily points");
  });
  await asRole(client, "anon", null, "rollback", async () => {
    await expectFailure(
      () => client.query("SELECT id FROM public.runs"),
      "42501",
      "permission denied",
    );
  });
  await asRole(client, "anon", null, "rollback", async () => {
    await expectFailure(
      () => client.query("SELECT private.is_admin()"),
      "42501",
      "permission denied",
    );
  });
  await asUser(client, userA, "rollback", async () => {
    await expectFailure(() => client.query("SELECT public.is_admin()"), "42883", "does not exist");
  });
  await asRole(client, "anon", null, "rollback", async () => {
    await expectFailure(
      () => client.query("SELECT tokens FROM public.provider_connections"),
      "42501",
      "permission denied",
    );
  });

  await client.query("BEGIN");
  await client.query("GRANT INSERT ON public.cell_ownership TO anon");
  await client.query("SET LOCAL ROLE anon");
  await expectFailure(
    () =>
      client.query(
        `INSERT INTO public.cell_ownership (
           zone_id, season_id, league_id, h3, owner_id, effort_id, pace_s, achieved_at
         ) VALUES ($1, $2, $3, $4, $5, $6, 300, now())`,
        [zone.id, season.id, league.id, cell.h3, userA, effort.id],
      ),
    "42501",
    "row-level security",
  );
  await client.query("ROLLBACK");

  await client.query("BEGIN");
  await client.query("GRANT SELECT ON public.provider_connections TO authenticated");
  await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [userA]);
  await client.query("SET LOCAL ROLE authenticated");
  const hidden = await client.query("SELECT count(*)::int AS n FROM public.provider_connections");
  if (asNumber(hidden.rows[0]?.n) !== 0) {
    throw new Error("authenticated read provider tokens through RLS");
  }
  await client.query("ROLLBACK");

  await asRole(client, "service_role", null, "rollback", async () => {
    const tokens = await client.query(
      "SELECT tokens->>'access_token' AS token FROM public.provider_connections",
    );
    if (tokens.rows[0]?.token !== "secret-access") {
      throw new Error("service_role should read provider tokens");
    }
  });

  await client.query("UPDATE public.profiles SET is_admin = true WHERE id = $1", [userA]);
  await asUser(client, userA, "rollback", async () => {
    const seen = await client.query("SELECT id FROM public.runs");
    if (seen.rows.length !== 4) throw new Error(`admin should see 4 runs, saw ${seen.rows.length}`);
    const admin = await client.query("SELECT private.is_admin() AS ok");
    if (admin.rows[0]?.ok !== true) throw new Error("is_admin() should be true");
  });
  await asUser(client, userB, "rollback", async () => {
    await expectFailure(
      () => client.query("UPDATE public.profiles SET is_admin = true WHERE id = $1", [userB]),
      "42501",
      "permission denied",
    );
  });

  const anonPrivilege = await one<{ ok: boolean }>(
    client,
    "SELECT has_table_privilege('anon', 'public.provider_connections', 'SELECT') AS ok",
  );
  if (anonPrivilege.ok) throw new Error("anon can select provider_connections");
  const tokenPrivilege = await one<{ ok: boolean }>(
    client,
    "SELECT has_column_privilege('authenticated', 'public.provider_connections', 'tokens', 'SELECT') AS ok",
  );
  if (tokenPrivilege.ok) throw new Error("authenticated can select tokens");

  await applyFile(client, seedPath);
  const stillActive = await one<{ status: string }>(
    client,
    "SELECT status FROM public.zones WHERE slug = 'jumeirah-kite'",
  );
  if (stillActive.status !== "active") throw new Error("seed reset an active zone to draft");
  await expectCount(client, "public.zone_cells", 99);
  await expectCount(client, "public.leagues", 4);
  await expectCount(client, "public.seasons", 1);

  await client.query(
    `UPDATE public.seasons
     SET status = 'active',
         starts_at = '2026-12-07 00:00:00+04',
         ends_at = '2026-12-27 23:59:59+04'
     WHERE id = $1`,
    [season.id],
  );
  await applyFile(client, seedPath);
  const seasonAfter = await one<{ status: string; starts_at: Date }>(
    client,
    "SELECT status, starts_at FROM public.seasons WHERE id = $1",
    [season.id],
  );
  if (seasonAfter.status !== "active") throw new Error("seed closed an active season");
  if (seasonAfter.starts_at.toISOString() !== "2026-12-06T20:00:00.000Z") {
    throw new Error(`seed moved an active season to ${seasonAfter.starts_at.toISOString()}`);
  }

  console.log("checking conquest");
  await verifyConquest(client, connectionString);

  console.log("db verify ok");
  await client.end();
}

async function verifyConquest(client: pg.Client, connectionString: string): Promise<void> {
  const cellA = "8a43a136148ffff";
  const cellB = "8a43a136149ffff";
  const zone = await one<{ id: string }>(
    client,
    `INSERT INTO public.zones (slug, name, polygon, h3_res, status, timezone)
     VALUES (
       'conquest-test', 'Conquest',
       extensions.ST_GeogFromText('SRID=4326;POLYGON((55 25, 55.02 25, 55.02 25.02, 55 25.02, 55 25))'),
       10, 'active', 'Asia/Dubai'
     ) RETURNING id`,
  );
  const ring = `extensions.ST_GeogFromText('SRID=4326;POLYGON((55 25, 55.01 25, 55.01 25.01, 55 25.01, 55 25))')`;
  const point = `extensions.ST_GeogFromText('SRID=4326;POINT(55.005 25.005)')`;
  for (const h3 of [cellA, cellB]) {
    await client.query(
      `INSERT INTO public.zone_cells (zone_id, h3, center, boundary)
       VALUES ($1, $2, ${point}, ${ring})`,
      [zone.id, h3],
    );
  }
  const elite = await one<{ id: string }>(
    client,
    "SELECT id FROM public.leagues WHERE zone_id IS NULL AND code = 'elite'",
  );
  const advanced = await one<{ id: string }>(
    client,
    "SELECT id FROM public.leagues WHERE zone_id IS NULL AND code = 'advanced'",
  );
  const season = await one<{ id: string }>(
    client,
    `INSERT INTO public.seasons (zone_id, name, starts_at, ends_at, status)
     VALUES ($1, 'Conquista', '2026-11-02 00:00:00+04', '2026-11-22 23:59:59+04', 'active')
     RETURNING id`,
    [zone.id],
  );

  const uploaded = "2026-11-02 12:00:00+04";
  const started = "2026-11-02 10:00:00+04";
  const ended = "2026-11-02 11:00:00+04";
  const run = async (
    userId: string,
    leagueId: string,
    hash: string,
    createdAt: string,
  ): Promise<string> => {
    const row = await one<{ id: string }>(
      client,
      `INSERT INTO public.runs (
         user_id, zone_id, season_id, league_id, storage_path, file_sha256, format,
         source, status, started_at, ended_at, created_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, 'gpx', 'upload', 'accepted', $7, $8, $9
       ) RETURNING id`,
      [
        userId,
        zone.id,
        season.id,
        leagueId,
        `server/${hash.slice(0, 8)}.gpx`,
        hash,
        started,
        ended,
        createdAt,
      ],
    );
    return row.id;
  };

  const effort = (h3: string, paceS: number, crossedAt: string): string =>
    JSON.stringify([{ h3, crossedAt, paceS, windowStartM: 0, windowEndM: 1000 }]);

  const ownerOf = async (
    leagueId: string,
    h3: string,
  ): Promise<{ owner_id: string; pace_s: number }> =>
    one(
      client,
      `SELECT owner_id, pace_s FROM public.cell_ownership
       WHERE season_id = $1 AND league_id = $2 AND h3 = $3`,
      [season.id, leagueId, h3],
    );

  const hash = (prefix: string) => `${prefix}${"a".repeat(Math.max(0, 64 - prefix.length))}`;
  const first = await run(userA, elite.id, hash("c0"), uploaded);
  await asRole(client, "service_role", null, "commit", async () => {
    await client.query("SELECT public.apply_run($1, $2::jsonb)", [
      first,
      effort(cellA, 300, "2026-11-02T06:00:00.000Z"),
    ]);
  });
  const conquered = await ownerOf(elite.id, cellA);
  if (conquered.owner_id !== userA || conquered.pace_s !== 300) {
    throw new Error("conquest did not give the cell to A");
  }

  const slower = await run(userB, elite.id, hash("c1"), "2026-11-02 13:00:00+04");
  await asRole(client, "service_role", null, "commit", async () => {
    await client.query("SELECT public.apply_run($1, $2::jsonb)", [
      slower,
      effort(cellA, 320, "2026-11-02T06:30:00.000Z"),
    ]);
  });
  if ((await ownerOf(elite.id, cellA)).owner_id !== userA)
    throw new Error("slower run stole the cell");
  const defended = await one<{ n: number }>(
    client,
    `SELECT count(*)::int AS n FROM public.ownership_events
     WHERE run_id = $1 AND type = 'defend'`,
    [slower],
  );
  if (defended.n !== 1) throw new Error("missing defend event");

  const faster = await run(userB, elite.id, hash("c2"), "2026-11-02 14:00:00+04");
  await asRole(client, "service_role", null, "commit", async () => {
    await client.query("SELECT public.apply_run($1, $2::jsonb)", [
      faster,
      effort(cellA, 280, "2026-11-02T07:00:00.000Z"),
    ]);
  });
  const stolen = await ownerOf(elite.id, cellA);
  if (stolen.owner_id !== userB || stolen.pace_s !== 280)
    throw new Error("faster run did not steal");

  const tied = await run(userA, elite.id, hash("c3"), "2026-11-02 15:00:00+04");
  await asRole(client, "service_role", null, "commit", async () => {
    await client.query("SELECT public.apply_run($1, $2::jsonb)", [
      tied,
      effort(cellB, 300, "2026-11-02T08:00:00.000Z"),
    ]);
  });
  const earlier = await run(userB, elite.id, hash("c4"), "2026-11-02 16:00:00+04");
  await asRole(client, "service_role", null, "commit", async () => {
    await client.query("SELECT public.apply_run($1, $2::jsonb)", [
      earlier,
      effort(cellB, 300, "2026-11-02T05:00:00.000Z"),
    ]);
  });
  if ((await ownerOf(elite.id, cellB)).owner_id !== userB) {
    throw new Error("equal pace should keep the runner who crossed first");
  }

  const improved = await run(userB, elite.id, hash("c5"), "2026-11-02 17:00:00+04");
  await asRole(client, "service_role", null, "commit", async () => {
    await client.query("SELECT public.apply_run($1, $2::jsonb)", [
      improved,
      effort(cellA, 260, "2026-11-02T07:10:00.000Z"),
    ]);
  });
  const better = await ownerOf(elite.id, cellA);
  if (better.owner_id !== userB || better.pace_s !== 260) throw new Error("owner did not improve");

  const otherLeague = await run(userA, advanced.id, hash("c6"), uploaded);
  await asRole(client, "service_role", null, "commit", async () => {
    await client.query("SELECT public.apply_run($1, $2::jsonb)", [
      otherLeague,
      effort(cellA, 400, "2026-11-02T06:00:00.000Z"),
    ]);
  });
  const both = await client.query<{ league_id: string; owner_id: string }>(
    `SELECT league_id, owner_id FROM public.cell_ownership
     WHERE season_id = $1 AND h3 = $2`,
    [season.id, cellA],
  );
  const byLeague = new Map(both.rows.map((row) => [row.league_id, row.owner_id]));
  if (byLeague.get(elite.id) !== userB || byLeague.get(advanced.id) !== userA) {
    throw new Error("each league should keep its own owner of the same cell");
  }

  const points = await one<{ cells_owned: number; points: number }>(
    client,
    `SELECT cells_owned, points FROM public.daily_points
     WHERE season_id = $1 AND league_id = $2 AND user_id = $3 AND day = '2026-11-02'`,
    [season.id, elite.id, userB],
  );
  if (points.cells_owned < 1 || points.points < points.cells_owned) {
    throw new Error(`daily points look empty: ${points.cells_owned}/${points.points}`);
  }

  await client.query("UPDATE public.runs SET status = 'voided' WHERE id = $1", [faster]);
  await client.query("UPDATE public.runs SET status = 'voided' WHERE id = $1", [improved]);
  await asRole(client, "service_role", null, "commit", async () => {
    await client.query("SELECT public.recompute_season($1)", [season.id]);
  });
  const restored = await ownerOf(elite.id, cellA);
  if (restored.owner_id !== userA || restored.pace_s !== 300) {
    throw new Error("void plus recompute did not restore A's cell");
  }
  const ghost = await one<{ n: number }>(
    client,
    "SELECT count(*)::int AS n FROM public.cell_efforts WHERE run_id = $1 OR run_id = $2",
    [faster, improved],
  );
  if (ghost.n !== 0) throw new Error("voided runs still have efforts");

  const late = await run(userB, elite.id, hash("c7"), "2026-11-06 12:00:00+04");
  await asRole(client, "service_role", null, "rollback", async () => {
    await expectFailure(
      () =>
        client.query("SELECT public.apply_run($1, $2::jsonb)", [
          late,
          effort(cellB, 200, "2026-11-02T06:00:00.000Z"),
        ]),
      "P0001",
      "out_of_window",
    );
  });

  await asRole(client, "authenticated", userA, "rollback", async () => {
    await expectFailure(
      () => client.query("SELECT public.apply_run($1, '[]'::jsonb)", [first]),
      "42501",
      "permission denied",
    );
  });

  const left = await run(userA, advanced.id, hash("c8"), "2026-11-02 18:00:00+04");
  const right = await run(userB, advanced.id, hash("c9"), "2026-11-02 18:30:00+04");
  const slowJson = effort(cellB, 350, "2026-11-02T06:20:00.000Z");
  const fastJson = effort(cellB, 310, "2026-11-02T06:40:00.000Z");
  const leftClient = new pg.Client({ connectionString });
  const rightClient = new pg.Client({ connectionString });
  await leftClient.connect();
  await rightClient.connect();
  try {
    await Promise.all([
      leftClient.query("SELECT public.apply_run($1, $2::jsonb)", [left, slowJson]),
      rightClient.query("SELECT public.apply_run($1, $2::jsonb)", [right, fastJson]),
    ]);
  } finally {
    await leftClient.end();
    await rightClient.end();
  }
  const raced = await ownerOf(advanced.id, cellB);
  if (raced.owner_id !== userB || raced.pace_s !== 310) {
    throw new Error("concurrent apply_run did not keep the faster mark");
  }
  const rows = await one<{ n: number }>(
    client,
    `SELECT count(*)::int AS n FROM public.cell_ownership
     WHERE season_id = $1 AND league_id = $2 AND h3 = $3`,
    [season.id, advanced.id, cellB],
  );
  if (rows.n !== 1) throw new Error("concurrent apply_run duplicated the cell");

  console.log("checking product review rules (T-27)");
  // 1. El día cierra antes de las 04:00 (hora de Dubái)
  const dayKeyTest = await one<{ d1: string; d2: string; d3: string }>(
    client,
    `SELECT private.zone_day_key('2026-11-03 03:59:00+04'::timestamptz, 'Asia/Dubai')::text AS d1,
            private.zone_day_key('2026-11-03 03:59:30+04'::timestamptz, 'Asia/Dubai')::text AS d2,
            private.zone_day_key('2026-11-03 04:00:00+04'::timestamptz, 'Asia/Dubai')::text AS d3`,
  );
  if (
    dayKeyTest.d1 !== "2026-11-02" ||
    dayKeyTest.d2 !== "2026-11-02" ||
    dayKeyTest.d3 !== "2026-11-03"
  ) {
    throw new Error(`zone_day_key failed: ${dayKeyTest.d1}, ${dayKeyTest.d2}, ${dayKeyTest.d3}`);
  }

  // 2. Debilitamiento (Decay): Day 7 vs Day 8, Tope de 60, Empate
  const cellDecay = "8a43a13614cffff";
  await client.query(
    `INSERT INTO public.zone_cells (zone_id, h3, center, boundary)
     VALUES ($1, $2, ${point}, ${ring}) ON CONFLICT DO NOTHING`,
    [zone.id, cellDecay],
  );
  // User A conquers cellDecay on Day 0 (2026-11-02) with pace 300
  const runDay0 = await one<{ id: string }>(
    client,
    `INSERT INTO public.runs (
       user_id, zone_id, season_id, league_id, storage_path, file_sha256, format,
       source, status, started_at, ended_at, created_at
     ) VALUES (
       $1, $2, $3, $4, 'server/decay0.gpx', $5, 'gpx', 'upload', 'accepted',
       '2026-11-02 09:00:00+04', '2026-11-02 10:00:00+04', '2026-11-02 11:00:00+04'
     ) RETURNING id`,
    [userA, zone.id, season.id, elite.id, hash("d0")],
  );
  await asRole(client, "service_role", null, "commit", async () => {
    await client.query("SELECT public.apply_run($1, $2::jsonb)", [
      runDay0.id,
      effort(cellDecay, 300, "2026-11-02T05:30:00.000Z"),
    ]);
  });
  if ((await ownerOf(elite.id, cellDecay)).owner_id !== userA) {
    throw new Error("decay test: conquest failed");
  }

  // Day 7: 2026-11-09 (7 days). Decay = 0.
  // User B tries to steal with pace 300 (empate) -> defiende (no roba).
  const runDay7 = await one<{ id: string }>(
    client,
    `INSERT INTO public.runs (
       user_id, zone_id, season_id, league_id, storage_path, file_sha256, format,
       source, status, started_at, ended_at, created_at
     ) VALUES (
       $1, $2, $3, $4, 'server/decay7.gpx', $5, 'gpx', 'upload', 'accepted',
       '2026-11-09 09:00:00+04', '2026-11-09 10:00:00+04', '2026-11-09 11:00:00+04'
     ) RETURNING id`,
    [userB, zone.id, season.id, elite.id, hash("d7")],
  );
  await asRole(client, "service_role", null, "commit", async () => {
    await client.query("SELECT public.apply_run($1, $2::jsonb)", [
      runDay7.id,
      effort(cellDecay, 300, "2026-11-09T05:30:00.000Z"),
    ]);
  });
  if ((await ownerOf(elite.id, cellDecay)).owner_id !== userA) {
    throw new Error("day 7: tie should defend");
  }

  // Day 8: 2026-11-10 (8 days). Decay = 5 s/km -> effective pace = 305 s/km.
  // User B with pace 305 (empate with decayed pace) -> defiende (no roba).
  const runDay8Tie = await one<{ id: string }>(
    client,
    `INSERT INTO public.runs (
       user_id, zone_id, season_id, league_id, storage_path, file_sha256, format,
       source, status, started_at, ended_at, created_at
     ) VALUES (
       $1, $2, $3, $4, 'server/decay8a.gpx', $5, 'gpx', 'upload', 'accepted',
       '2026-11-10 08:00:00+04', '2026-11-10 09:00:00+04', '2026-11-10 09:30:00+04'
     ) RETURNING id`,
    [userB, zone.id, season.id, elite.id, hash("d8a")],
  );
  await asRole(client, "service_role", null, "commit", async () => {
    await client.query("SELECT public.apply_run($1, $2::jsonb)", [
      runDay8Tie.id,
      effort(cellDecay, 305, "2026-11-10T04:30:00.000Z"),
    ]);
  });
  if ((await ownerOf(elite.id, cellDecay)).owner_id !== userA) {
    throw new Error("day 8: tie with decayed pace should defend");
  }

  // User B with pace 304 (< 305) -> roba!
  const runDay8Steal = await one<{ id: string }>(
    client,
    `INSERT INTO public.runs (
       user_id, zone_id, season_id, league_id, storage_path, file_sha256, format,
       source, status, started_at, ended_at, created_at
     ) VALUES (
       $1, $2, $3, $4, 'server/decay8b.gpx', $5, 'gpx', 'upload', 'accepted',
       '2026-11-10 10:00:00+04', '2026-11-10 11:00:00+04', '2026-11-10 11:30:00+04'
     ) RETURNING id`,
    [userB, zone.id, season.id, elite.id, hash("d8b")],
  );
  await asRole(client, "service_role", null, "commit", async () => {
    await client.query("SELECT public.apply_run($1, $2::jsonb)", [
      runDay8Steal.id,
      effort(cellDecay, 304, "2026-11-10T06:30:00.000Z"),
    ]);
  });
  const stolenDay8 = await ownerOf(elite.id, cellDecay);
  if (stolenDay8.owner_id !== userB || stolenDay8.pace_s !== 304) {
    throw new Error("day 8: pace 304 did not steal weakened pace of 305");
  }

  // 3. Regla 3: Tope de 20 puntos diarios
  const starter = await one<{ id: string }>(
    client,
    "SELECT id FROM public.leagues WHERE code = 'starter'",
  );
  const intermediate = await one<{ id: string }>(
    client,
    "SELECT id FROM public.leagues WHERE code = 'intermediate'",
  );

  // Seed 25 cells for userB on Day 0 in starter league
  const dummyCells: string[] = [];
  for (let i = 0; i < 25; i += 1) {
    const h3 = `8a43a13614${i.toString(16).padStart(2, "0")}fff`;
    dummyCells.push(h3);
    await client.query(
      `INSERT INTO public.zone_cells (zone_id, h3, center, boundary)
       VALUES ($1, $2, ${point}, ${ring}) ON CONFLICT DO NOTHING`,
      [zone.id, h3],
    );
  }
  const run25 = await one<{ id: string }>(
    client,
    `INSERT INTO public.runs (
       user_id, zone_id, season_id, league_id, storage_path, file_sha256, format,
       source, status, started_at, ended_at, created_at
     ) VALUES (
       $1, $2, $3, $4, 'server/cells25.gpx', $5, 'gpx', 'upload', 'accepted',
       '2026-11-02 06:00:00+04', '2026-11-02 08:00:00+04', '2026-11-02 08:30:00+04'
     ) RETURNING id`,
    [userB, zone.id, season.id, starter.id, hash("c25")],
  );
  const efforts25 = JSON.stringify(
    dummyCells.map((h3) => ({
      h3,
      crossedAt: "2026-11-02T03:00:00.000Z",
      paceS: 320,
      windowStartM: 0,
      windowEndM: 1000,
    })),
  );
  await asRole(client, "service_role", null, "commit", async () => {
    await client.query("SELECT public.apply_run($1, $2::jsonb)", [run25.id, efforts25]);
  });
  const points25 = await one<{ cells_owned: number; points: number }>(
    client,
    `SELECT cells_owned, points FROM public.daily_points
     WHERE season_id = $1 AND league_id = $2 AND user_id = $3 AND day = '2026-11-02'`,
    [season.id, starter.id, userB],
  );
  // cells_owned is 25, but cell points are capped at 20 (+ 25 conquests = 45 total)
  if (points25.cells_owned !== 25) {
    throw new Error(`expected 25 cells owned, got ${points25.cells_owned}`);
  }
  if (points25.points !== 20 + 25) {
    throw new Error(`expected 45 points (20 cap + 25 conquests), got ${points25.points}`);
  }

  // 4. Regla 4: Liberación de baldosas al ascender de liga
  // User B currently owns 25 cells in starter.
  // Insert a promotion into user_leagues to intermediate.
  await client.query(
    `INSERT INTO public.user_leagues (user_id, season_id, league_id, ref_pace_s, reason, valid_from)
     VALUES ($1, $2, $3, 300, 'promotion', '2026-11-02 12:00:00+04')`,
    [userB, season.id, intermediate.id],
  );
  // Trigger should have liberated User B's cells in starter!
  const liberated = await client.query(
    `SELECT count(*)::int AS n FROM public.cell_ownership
     WHERE season_id = $1 AND league_id = $2 AND owner_id = $3`,
    [season.id, starter.id, userB],
  );
  if (asNumber(liberated.rows[0]?.n) !== 0) {
    throw new Error(`promotion trigger did not liberate cells: ${liberated.rows[0]?.n} remain`);
  }

  // Also verify recompute_season does not resurrect previous league cells for promoted user
  await asRole(client, "service_role", null, "commit", async () => {
    await client.query("SELECT public.recompute_season($1)", [season.id]);
  });
  const afterRecompute = await client.query(
    `SELECT count(*)::int AS n FROM public.cell_ownership
     WHERE season_id = $1 AND league_id = $2 AND owner_id = $3`,
    [season.id, starter.id, userB],
  );
  if (asNumber(afterRecompute.rows[0]?.n) !== 0) {
    throw new Error(
      `recompute_season restored liberated cells: ${afterRecompute.rows[0]?.n} remain`,
    );
  }

  // 5. Late uploaded run: ended at 07:00, promotion at 12:00, uploaded at 13:00.
  // The run was uploaded after promotion, so recompute_season must preserve this cell.
  const cellLate = "8a43a1361430fff";
  await client.query(
    `INSERT INTO public.zone_cells (zone_id, h3, center, boundary)
     VALUES ($1, $2, ${point}, ${ring}) ON CONFLICT DO NOTHING`,
    [zone.id, cellLate],
  );
  const runLate = await one<{ id: string }>(
    client,
    `INSERT INTO public.runs (
       user_id, zone_id, season_id, league_id, storage_path, file_sha256, format,
       source, status, started_at, ended_at, created_at
     ) VALUES (
       $1, $2, $3, $4, 'server/late.gpx', $5, 'gpx', 'upload', 'accepted',
       '2026-11-02 06:00:00+04', '2026-11-02 07:00:00+04', '2026-11-02 13:00:00+04'
     ) RETURNING id`,
    [userB, zone.id, season.id, starter.id, hash("fa")],
  );
  await asRole(client, "service_role", null, "commit", async () => {
    await client.query("SELECT public.apply_run($1, $2::jsonb)", [
      runLate.id,
      effort(cellLate, 310, "2026-11-02T02:30:00.000Z"),
    ]);
  });
  if ((await ownerOf(starter.id, cellLate)).owner_id !== userB) {
    throw new Error("late run test: conquest failed");
  }

  // After recompute_season, this cell must STILL belong to userB in starter
  await asRole(client, "service_role", null, "commit", async () => {
    await client.query("SELECT public.recompute_season($1)", [season.id]);
  });
  const lateOwnerAfter = await ownerOf(starter.id, cellLate);
  if (lateOwnerAfter.owner_id !== userB) {
    throw new Error(
      `recompute_season incorrectly liberated late-uploaded cell: owned by ${lateOwnerAfter.owner_id}, expected ${userB}`,
    );
  }
  const starterRemaining = await client.query(
    `SELECT count(*)::int AS n FROM public.cell_ownership
     WHERE season_id = $1 AND league_id = $2 AND owner_id = $3`,
    [season.id, starter.id, userB],
  );
  if (asNumber(starterRemaining.rows[0]?.n) !== 1) {
    throw new Error(
      `expected exactly 1 cell remaining in starter for userB, got ${starterRemaining.rows[0]?.n}`,
    );
  }
}

async function connect(connectionString: string): Promise<pg.Client> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const client = new pg.Client({ connectionString });
    try {
      await client.connect();
      return client;
    } catch (error) {
      lastError = error;
      try {
        await client.end();
      } catch {
        // ignore
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw lastError;
}

async function resetDatabase(client: pg.Client): Promise<void> {
  const statements = [
    "DROP EXTENSION IF EXISTS postgis_tiger_geocoder CASCADE",
    "DROP EXTENSION IF EXISTS postgis_topology CASCADE",
    "DROP EXTENSION IF EXISTS postgis CASCADE",
    "DROP SCHEMA IF EXISTS extensions CASCADE",
    "DROP SCHEMA IF EXISTS private CASCADE",
    "DROP SCHEMA IF EXISTS public CASCADE",
    "DROP SCHEMA IF EXISTS auth CASCADE",
    "CREATE SCHEMA public",
    "GRANT ALL ON SCHEMA public TO CURRENT_USER",
    "GRANT USAGE, CREATE ON SCHEMA public TO PUBLIC",
    "SET search_path TO public",
  ];
  for (const statement of statements) {
    await client.query(statement);
  }
}

async function applyFile(client: pg.Client, file: string): Promise<void> {
  const statements = splitSql(readFileSync(file, "utf8"));
  await client.query("BEGIN");
  try {
    for (const statement of statements) {
      try {
        await client.query(statement);
      } catch (error) {
        throw new Error(`${file}\n${errorText(error)}\nSQL: ${preview(statement)}`);
      }
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function one<T extends pg.QueryResultRow>(
  client: pg.Client,
  sql: string,
  params: unknown[] = [],
): Promise<T> {
  const result = await client.query<T>(sql, params);
  const row = result.rows[0];
  if (!row) throw new Error(`no row for ${preview(sql)}`);
  return row;
}

async function expectCount(client: pg.Client, table: string, expected: number): Promise<void> {
  const row = await one<{ n: number }>(client, `SELECT count(*)::int AS n FROM ${table}`);
  if (row.n !== expected) throw new Error(`${table} has ${row.n} rows, expected ${expected}`);
}

async function asRole(
  client: pg.Client,
  role: "anon" | "authenticated" | "service_role",
  userId: string | null,
  ending: "rollback" | "commit",
  fn: () => Promise<void>,
): Promise<void> {
  await client.query("BEGIN");
  try {
    await client.query("SELECT set_config('request.jwt.claim.sub', $1::text, true)", [
      userId ?? "",
    ]);
    await client.query(`SET LOCAL ROLE ${role}`);
    await fn();
    await client.query(ending === "commit" ? "COMMIT" : "ROLLBACK");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function asUser(
  client: pg.Client,
  userId: string,
  ending: "rollback" | "commit",
  fn: () => Promise<void>,
): Promise<void> {
  await asRole(client, "authenticated", userId, ending, fn);
}

main().catch((error: unknown) => {
  console.error(errorText(error));
  process.exit(1);
});
