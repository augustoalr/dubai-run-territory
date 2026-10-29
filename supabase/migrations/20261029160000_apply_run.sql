-- Motor de conquista (T-12). No aplicar en el proyecto remoto hasta revisarla.
-- apply_run, recompute_season y snapshot_daily_points solo las ejecuta service_role.

CREATE FUNCTION private.claim_cell(
  p_run_id uuid,
  p_user_id uuid,
  p_zone_id uuid,
  p_season_id uuid,
  p_league_id uuid,
  p_h3 text,
  p_pace_s integer,
  p_crossed_at timestamptz,
  p_uploaded_at timestamptz,
  p_effort_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_owner uuid;
  v_pace integer;
  v_achieved timestamptz;
  v_uploaded timestamptz;
  v_take boolean;
  v_type text;
BEGIN
  SELECT o.owner_id, o.pace_s, o.achieved_at, r.created_at
  INTO v_owner, v_pace, v_achieved, v_uploaded
  FROM public.cell_ownership AS o
  JOIN public.cell_efforts AS e ON e.id = o.effort_id
  JOIN public.runs AS r ON r.id = e.run_id
  WHERE o.zone_id = p_zone_id
    AND o.season_id = p_season_id
    AND o.league_id = p_league_id
    AND o.h3 = p_h3
  FOR UPDATE OF o;

  IF NOT FOUND THEN
    BEGIN
      INSERT INTO public.cell_ownership (
        zone_id, season_id, league_id, h3, owner_id, effort_id, pace_s, achieved_at, since
      ) VALUES (
        p_zone_id, p_season_id, p_league_id, p_h3, p_user_id, p_effort_id,
        p_pace_s, p_crossed_at, p_uploaded_at
      );
      INSERT INTO public.ownership_events (
        type, zone_id, h3, league_id, season_id, actor_id, prev_owner_id, run_id, created_at
      ) VALUES (
        'conquest', p_zone_id, p_h3, p_league_id, p_season_id,
        p_user_id, NULL, p_run_id, p_uploaded_at
      );
      RETURN 'conquest';
    EXCEPTION
      WHEN unique_violation THEN
        SELECT o.owner_id, o.pace_s, o.achieved_at, r.created_at
        INTO v_owner, v_pace, v_achieved, v_uploaded
        FROM public.cell_ownership AS o
        JOIN public.cell_efforts AS e ON e.id = o.effort_id
        JOIN public.runs AS r ON r.id = e.run_id
        WHERE o.zone_id = p_zone_id
          AND o.season_id = p_season_id
          AND o.league_id = p_league_id
          AND o.h3 = p_h3
        FOR UPDATE OF o;
    END;
  END IF;

  v_take := p_pace_s < v_pace
    OR (
      p_pace_s = v_pace
      AND (
        p_crossed_at < v_achieved
        OR (p_crossed_at = v_achieved AND p_uploaded_at < v_uploaded)
      )
    );

  IF NOT v_take THEN
    IF v_owner IS DISTINCT FROM p_user_id THEN
      INSERT INTO public.ownership_events (
        type, zone_id, h3, league_id, season_id, actor_id, prev_owner_id, run_id, created_at
      ) VALUES (
        'defend', p_zone_id, p_h3, p_league_id, p_season_id,
        p_user_id, v_owner, p_run_id, p_uploaded_at
      );
      RETURN 'defend';
    END IF;
    RETURN 'keep';
  END IF;

  v_type := CASE WHEN v_owner = p_user_id THEN 'improve' ELSE 'steal' END;
  UPDATE public.cell_ownership
  SET owner_id = p_user_id,
      effort_id = p_effort_id,
      pace_s = p_pace_s,
      achieved_at = p_crossed_at,
      since = p_uploaded_at
  WHERE zone_id = p_zone_id
    AND season_id = p_season_id
    AND league_id = p_league_id
    AND h3 = p_h3;

  INSERT INTO public.ownership_events (
    type, zone_id, h3, league_id, season_id, actor_id, prev_owner_id, run_id, created_at
  ) VALUES (
    v_type, p_zone_id, p_h3, p_league_id, p_season_id,
    p_user_id, v_owner, p_run_id, p_uploaded_at
  );
  RETURN v_type;
END;
$$;

REVOKE ALL ON FUNCTION private.claim_cell(
  uuid, uuid, uuid, uuid, uuid, text, integer, timestamptz, timestamptz, uuid
) FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION private.claim_cell(
  uuid, uuid, uuid, uuid, uuid, text, integer, timestamptz, timestamptz, uuid
) IS
  'Una celda, ya bloqueada. No es un RPC: solo la llama apply_run.';

CREATE FUNCTION public.snapshot_daily_points(p_season_id uuid, p_day date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tz text;
  v_cutoff timestamptz;
BEGIN
  SELECT zone.timezone
  INTO v_tz
  FROM public.seasons AS season
  JOIN public.zones AS zone ON zone.id = season.zone_id
  WHERE season.id = p_season_id;
  IF v_tz IS NULL THEN
    RAISE EXCEPTION 'season not found';
  END IF;

  v_cutoff := ((p_day + 1)::timestamp) AT TIME ZONE v_tz;

  DELETE FROM public.daily_points
  WHERE season_id = p_season_id
    AND day = p_day;

  INSERT INTO public.daily_points (season_id, league_id, user_id, day, cells_owned, points)
  WITH owned AS (
    SELECT DISTINCT ON (event.league_id, event.h3)
      event.league_id,
      event.actor_id AS user_id
    FROM public.ownership_events AS event
    WHERE event.season_id = p_season_id
      AND event.type IN ('conquest', 'steal')
      AND event.created_at < v_cutoff
    ORDER BY event.league_id, event.h3, event.created_at DESC, event.id DESC
  ),
  cells AS (
    SELECT league_id, user_id, count(*)::integer AS cells_owned
    FROM owned
    GROUP BY league_id, user_id
  ),
  bonuses AS (
    SELECT
      event.league_id,
      event.actor_id AS user_id,
      (
        count(*) FILTER (WHERE event.type = 'conquest')
        + 2 * count(*) FILTER (WHERE event.type = 'steal')
      )::integer AS bonus
    FROM public.ownership_events AS event
    WHERE event.season_id = p_season_id
      AND event.type IN ('conquest', 'steal')
      AND event.created_at < v_cutoff
    GROUP BY event.league_id, event.actor_id
  ),
  people AS (
    SELECT league_id, user_id FROM cells
    UNION
    SELECT league_id, user_id FROM bonuses
  )
  SELECT
    p_season_id,
    people.league_id,
    people.user_id,
    p_day,
    COALESCE(cells.cells_owned, 0),
    COALESCE(cells.cells_owned, 0) + COALESCE(bonuses.bonus, 0)
  FROM people
  LEFT JOIN cells USING (league_id, user_id)
  LEFT JOIN bonuses USING (league_id, user_id);
END;
$$;

REVOKE ALL ON FUNCTION public.snapshot_daily_points(uuid, date)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.snapshot_daily_points(uuid, date) TO service_role;

COMMENT ON FUNCTION public.snapshot_daily_points(uuid, date) IS
  'Foto del día (hora de la zona): celdas poseídas al cierre, más 1 por conquista y 2 por robo acumulados.';

CREATE FUNCTION public.apply_run(p_run_id uuid, p_efforts jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid;
  v_zone uuid;
  v_season uuid;
  v_league uuid;
  v_status text;
  v_started timestamptz;
  v_ended timestamptz;
  v_uploaded timestamptz;
  v_season_status text;
  v_starts timestamptz;
  v_ends timestamptz;
  v_tz text;
  v_recompute text;
  v_elem jsonb;
  v_h3 text;
  v_pace integer;
  v_crossed timestamptz;
  v_start_m double precision;
  v_end_m double precision;
  v_effort uuid;
  v_event text;
  v_events jsonb := '[]'::jsonb;
  v_day date;
BEGIN
  IF jsonb_typeof(p_efforts) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'efforts must be an array';
  END IF;

  SELECT
    run.user_id, run.zone_id, run.season_id, run.league_id, run.status,
    run.started_at, run.ended_at, run.created_at
  INTO v_user, v_zone, v_season, v_league, v_status, v_started, v_ended, v_uploaded
  FROM public.runs AS run
  WHERE run.id = p_run_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'run not found';
  END IF;
  IF v_status IS DISTINCT FROM 'accepted' THEN
    RAISE EXCEPTION 'run is not accepted';
  END IF;
  IF v_season IS NULL OR v_league IS NULL OR v_started IS NULL OR v_ended IS NULL THEN
    RAISE EXCEPTION 'run is missing season, league or times';
  END IF;

  SELECT season.status, season.starts_at, season.ends_at, zone.timezone
  INTO v_season_status, v_starts, v_ends, v_tz
  FROM public.seasons AS season
  JOIN public.zones AS zone ON zone.id = season.zone_id
  WHERE season.id = v_season
    AND season.zone_id = v_zone
  FOR UPDATE OF season;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'season not found';
  END IF;

  v_recompute := current_setting('territory.recompute', true);
  IF v_season_status IS DISTINCT FROM 'active' AND v_recompute IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'season is not active';
  END IF;
  IF v_started < v_starts OR v_started > v_ends THEN
    RAISE EXCEPTION 'OUT_OF_WINDOW';
  END IF;
  IF v_uploaded > v_ended + interval '72 hours' THEN
    RAISE EXCEPTION 'OUT_OF_WINDOW';
  END IF;

  IF EXISTS (SELECT 1 FROM public.cell_efforts WHERE run_id = p_run_id) THEN
    RAISE EXCEPTION 'run already applied';
  END IF;

  FOR v_elem IN
    SELECT value
    FROM jsonb_array_elements(p_efforts) AS effort(value)
    ORDER BY effort.value ->> 'h3'
  LOOP
    IF (
      SELECT count(*) FROM jsonb_object_keys(v_elem)
    ) <> 5
    OR NOT (
      v_elem ? 'h3' AND v_elem ? 'crossedAt' AND v_elem ? 'paceS'
      AND v_elem ? 'windowStartM' AND v_elem ? 'windowEndM'
    ) THEN
      RAISE EXCEPTION 'effort keys must be h3, crossedAt, paceS, windowStartM, windowEndM';
    END IF;

    v_h3 := v_elem ->> 'h3';
    IF v_h3 IS NULL OR v_h3 !~ '^[0-9a-f]{15}$' THEN
      RAISE EXCEPTION 'h3 must be a 15-character lowercase hex index';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.cell_efforts WHERE run_id = p_run_id AND h3 = v_h3
    ) THEN
      RAISE EXCEPTION 'duplicate cell %', v_h3;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.zone_cells WHERE zone_id = v_zone AND h3 = v_h3
    ) THEN
      RAISE EXCEPTION 'cell % is outside the zone', v_h3;
    END IF;

    IF jsonb_typeof(v_elem -> 'paceS') IS DISTINCT FROM 'number'
      OR (v_elem ->> 'paceS') !~ '^[0-9]+$'
      OR (v_elem ->> 'paceS')::integer <= 0 THEN
      RAISE EXCEPTION 'paceS must be a positive integer';
    END IF;
    v_pace := (v_elem ->> 'paceS')::integer;

    BEGIN
      v_crossed := (v_elem ->> 'crossedAt')::timestamptz;
    EXCEPTION
      WHEN invalid_datetime_format OR datetime_field_overflow THEN
        RAISE EXCEPTION 'crossedAt must be a timestamp';
    END;
    IF v_crossed IS NULL OR (v_elem ->> 'crossedAt') !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$' THEN
      RAISE EXCEPTION 'crossedAt must be a UTC toISOString timestamp';
    END IF;

    v_start_m := (v_elem ->> 'windowStartM')::double precision;
    v_end_m := (v_elem ->> 'windowEndM')::double precision;
    IF v_start_m IS NULL OR v_end_m IS NULL OR v_start_m < 0
      OR abs(v_end_m - v_start_m - 1000) > 0.001 THEN
      RAISE EXCEPTION 'the pace window must be 1000 metres';
    END IF;

    INSERT INTO public.cell_efforts (
      run_id, user_id, zone_id, season_id, league_id, h3, crossed_at, pace_s,
      window_start_m, window_end_m
    ) VALUES (
      p_run_id, v_user, v_zone, v_season, v_league, v_h3, v_crossed, v_pace,
      v_start_m, v_end_m
    )
    RETURNING id INTO v_effort;

    v_event := private.claim_cell(
      p_run_id, v_user, v_zone, v_season, v_league, v_h3, v_pace, v_crossed,
      v_uploaded, v_effort
    );
    v_events := v_events || jsonb_build_array(jsonb_build_object('h3', v_h3, 'type', v_event));
  END LOOP;

  v_day := (v_uploaded AT TIME ZONE v_tz)::date;
  PERFORM public.snapshot_daily_points(v_season, v_day);
  RETURN jsonb_build_object('events', v_events);
END;
$$;

REVOKE ALL ON FUNCTION public.apply_run(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_run(uuid, jsonb) TO service_role;

COMMENT ON FUNCTION public.apply_run(uuid, jsonb) IS
  'Aplica CellEffort[] a una carrera accepted. Bloquea la temporada y cada celda. Solo service_role.';

CREATE FUNCTION public.recompute_season(p_season_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_run record;
  v_efforts jsonb;
  v_count integer := 0;
  v_from date;
  v_to date;
  v_day date;
  v_tz text;
BEGIN
  PERFORM 1 FROM public.seasons WHERE id = p_season_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'season not found';
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS conquest_replay (
    run_id uuid PRIMARY KEY,
    efforts jsonb NOT NULL,
    created_at timestamptz NOT NULL
  ) ON COMMIT DROP;
  TRUNCATE conquest_replay;

  INSERT INTO conquest_replay (run_id, efforts, created_at)
  SELECT
    run.id,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'h3', effort.h3,
            'crossedAt', to_char(effort.crossed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
            'paceS', effort.pace_s,
            'windowStartM', effort.window_start_m,
            'windowEndM', effort.window_end_m
          )
          ORDER BY effort.h3
        )
        FROM public.cell_efforts AS effort
        WHERE effort.run_id = run.id
      ),
      '[]'::jsonb
    ),
    run.created_at
  FROM public.runs AS run
  JOIN public.seasons AS season ON season.id = run.season_id
  WHERE run.season_id = p_season_id
    AND run.status = 'accepted'
    AND run.started_at >= season.starts_at
    AND run.started_at <= season.ends_at
    AND run.ended_at IS NOT NULL
    AND run.created_at <= run.ended_at + interval '72 hours';

  DELETE FROM public.daily_points WHERE season_id = p_season_id;
  DELETE FROM public.ownership_events WHERE season_id = p_season_id;
  DELETE FROM public.cell_ownership WHERE season_id = p_season_id;
  DELETE FROM public.cell_efforts WHERE season_id = p_season_id;

  PERFORM set_config('territory.recompute', 'on', true);
  FOR v_run IN
    SELECT run_id, efforts FROM conquest_replay ORDER BY created_at, run_id
  LOOP
    PERFORM public.apply_run(v_run.run_id, v_run.efforts);
    v_count := v_count + 1;
  END LOOP;

  SELECT zone.timezone, (season.starts_at AT TIME ZONE zone.timezone)::date,
         (season.ends_at AT TIME ZONE zone.timezone)::date
  INTO v_tz, v_from, v_to
  FROM public.seasons AS season
  JOIN public.zones AS zone ON zone.id = season.zone_id
  WHERE season.id = p_season_id;

  v_to := LEAST(
    v_to,
    GREATEST(
      (now() AT TIME ZONE v_tz)::date,
      COALESCE(
        (
          SELECT max((event.created_at AT TIME ZONE v_tz)::date)
          FROM public.ownership_events AS event
          WHERE event.season_id = p_season_id
        ),
        v_from
      )
    )
  );

  IF v_to >= v_from THEN
    v_day := v_from;
    WHILE v_day <= v_to LOOP
      PERFORM public.snapshot_daily_points(p_season_id, v_day);
      v_day := v_day + 1;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('runs', v_count);
END;
$$;

REVOKE ALL ON FUNCTION public.recompute_season(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_season(uuid) TO service_role;

COMMENT ON FUNCTION public.recompute_season(uuid) IS
  'Borra el mapa de la temporada y vuelve a aplicar las carreras accepted que siguen en ventana. Solo service_role.';
