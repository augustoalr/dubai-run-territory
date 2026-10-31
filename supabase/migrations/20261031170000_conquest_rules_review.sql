-- Reglas de la revisión de producto para el motor de conquista (T-27).
-- 1. El día cierra antes de las 04:00 (hora de Dubái) (en lugar de medianoche) para snapshot_daily_points y contar días.
-- 2. Debilitamiento: si el dueño no corre la baldosa en 7 días, empeora 5 s/km por día (máx 60 s/km).
-- 3. Tope de 20 puntos diarios por baldosas poseídas (+1 conquista y +2 robo siguen aparte).
-- 4. Al ascender de liga, se liberan las baldosas que la persona tenía en su liga anterior.
-- Funciones SECURITY DEFINER con search_path vacío, ejecutables solo por service_role.

-- Función auxiliar para obtener la fecha de juego en la zona horaria dada: el día cierra antes de las 04:00 (hora de Dubái).
CREATE OR REPLACE FUNCTION private.zone_day_key(p_ts timestamptz, p_tz text)
RETURNS date
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT ((p_ts AT TIME ZONE p_tz) - interval '4 hours')::date;
$$;

REVOKE ALL ON FUNCTION private.zone_day_key(timestamptz, text)
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION private.zone_day_key(timestamptz, text) IS
  'Calcula la fecha de juego en la zona horaria: el día cierra antes de las 04:00 (hora de Dubái).';

-- Trigger para liberar baldosas al ascender de liga (Regla 4).
CREATE OR REPLACE FUNCTION private.handle_league_promotion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.reason = 'promotion' THEN
    DELETE FROM public.cell_ownership
    WHERE season_id = NEW.season_id
      AND owner_id = NEW.user_id
      AND league_id <> NEW.league_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.handle_league_promotion()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS user_league_promoted ON public.user_leagues;
CREATE TRIGGER user_league_promoted
  AFTER INSERT ON public.user_leagues
  FOR EACH ROW
  EXECUTE FUNCTION private.handle_league_promotion();

COMMENT ON FUNCTION private.handle_league_promotion() IS
  'Al ascender de liga (reason = promotion), libera las baldosas que el corredor tenía en su liga anterior.';

-- claim_cell con debilitamiento y cierre antes de las 04:00 (hora de Dubái) (Reglas 1 y 2).
CREATE OR REPLACE FUNCTION private.claim_cell(
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
  v_tz text;
  v_last_run timestamptz;
  v_owner_day date;
  v_incoming_day date;
  v_days integer;
  v_decay integer := 0;
  v_effective_pace integer;
BEGIN
  SELECT zone.timezone
  INTO v_tz
  FROM public.zones AS zone
  WHERE zone.id = p_zone_id;

  IF v_tz IS NULL THEN
    v_tz := 'Asia/Dubai';
  END IF;

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

  -- Si es el propio dueño:
  IF v_owner = p_user_id THEN
    IF p_pace_s < v_pace THEN
      UPDATE public.cell_ownership
      SET effort_id = p_effort_id,
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
        'improve', p_zone_id, p_h3, p_league_id, p_season_id,
        p_user_id, v_owner, p_run_id, p_uploaded_at
      );
      RETURN 'improve';
    ELSE
      -- Vuelve a correrla sin mejorar ritmo; mantiene la baldosa y reinicia el plazo de 7 días.
      RETURN 'keep';
    END IF;
  END IF;

  -- Es un rival (v_owner <> p_user_id).
  -- Buscar cuándo corrió el dueño esta baldosa por última vez.
  SELECT COALESCE(max(crossed_at), v_achieved)
  INTO v_last_run
  FROM public.cell_efforts
  WHERE zone_id = p_zone_id
    AND season_id = p_season_id
    AND league_id = p_league_id
    AND h3 = p_h3
    AND user_id = v_owner
    AND crossed_at <= p_crossed_at;

  IF v_last_run IS NULL THEN
    v_last_run := v_achieved;
  END IF;

  -- Contar días: el día cierra antes de las 04:00 (hora de Dubái).
  v_owner_day := private.zone_day_key(v_last_run, v_tz);
  v_incoming_day := private.zone_day_key(p_crossed_at, v_tz);
  v_days := v_incoming_day - v_owner_day;

  -- Debilitamiento: si no la ha corrido en 7 días, empeora 5 s/km por día hasta máx 60 s/km.
  IF v_days > 7 THEN
    v_decay := LEAST(60, (v_days - 7) * 5);
  ELSE
    v_decay := 0;
  END IF;

  v_effective_pace := v_pace + v_decay;

  -- Se roba si el ritmo es estrictamente menor al tiempo debilitado.
  -- En caso de empate con el tiempo debilitado, o si no lo supera, defiende.
  v_take := p_pace_s < v_effective_pace
    OR (
      p_pace_s = v_effective_pace
      AND v_decay = 0
      AND (
        p_crossed_at < v_achieved
        OR (p_crossed_at = v_achieved AND p_uploaded_at < v_uploaded)
      )
    );

  IF NOT v_take THEN
    INSERT INTO public.ownership_events (
      type, zone_id, h3, league_id, season_id, actor_id, prev_owner_id, run_id, created_at
    ) VALUES (
      'defend', p_zone_id, p_h3, p_league_id, p_season_id,
      p_user_id, v_owner, p_run_id, p_uploaded_at
    );
    RETURN 'defend';
  END IF;

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
    'steal', p_zone_id, p_h3, p_league_id, p_season_id,
    p_user_id, v_owner, p_run_id, p_uploaded_at
  );
  RETURN 'steal';
END;
$$;

REVOKE ALL ON FUNCTION private.claim_cell(
  uuid, uuid, uuid, uuid, uuid, text, integer, timestamptz, timestamptz, uuid
) FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION private.claim_cell(
  uuid, uuid, uuid, uuid, uuid, text, integer, timestamptz, timestamptz, uuid
) IS
  'Una celda, ya bloqueada. Aplica debilitamiento tras 7 días de inactividad (5 s/km por día, máx 60).';

-- snapshot_daily_points: el día cierra antes de las 04:00 (hora de Dubái), tope de 20 puntos por posesión y liberación por ascenso.
CREATE OR REPLACE FUNCTION public.snapshot_daily_points(p_season_id uuid, p_day date)
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

  -- Cierre del día de juego: el día p_day concluye antes de las 04:00 hora de la zona del día siguiente.
  v_cutoff := ((p_day + 1)::timestamp + interval '4 hours') AT TIME ZONE v_tz;

  DELETE FROM public.daily_points
  WHERE season_id = p_season_id
    AND day = p_day;

  INSERT INTO public.daily_points (season_id, league_id, user_id, day, cells_owned, points)
  WITH raw_owned AS (
    SELECT DISTINCT ON (event.league_id, event.h3)
      event.league_id,
      event.actor_id AS user_id,
      event.created_at AS acquired_at
    FROM public.ownership_events AS event
    WHERE event.season_id = p_season_id
      AND event.type IN ('conquest', 'steal')
      AND event.created_at < v_cutoff
    ORDER BY event.league_id, event.h3, event.created_at DESC, event.id DESC
  ),
  -- Liberación de baldosas al ascender de liga antes o en el corte del día.
  owned AS (
    SELECT o.league_id, o.user_id
    FROM raw_owned AS o
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.user_leagues AS ul
      WHERE ul.user_id = o.user_id
        AND ul.season_id = p_season_id
        AND ul.reason = 'promotion'
        AND ul.league_id <> o.league_id
        AND ul.valid_from >= o.acquired_at
        AND ul.valid_from < v_cutoff
    )
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
    -- Tope de 20 puntos diarios por baldosas poseídas; +1 conquista y +2 robo siguen aparte.
    LEAST(20, COALESCE(cells.cells_owned, 0)) + COALESCE(bonuses.bonus, 0)
  FROM people
  LEFT JOIN cells USING (league_id, user_id)
  LEFT JOIN bonuses USING (league_id, user_id);
END;
$$;

REVOKE ALL ON FUNCTION public.snapshot_daily_points(uuid, date)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.snapshot_daily_points(uuid, date) TO service_role;

COMMENT ON FUNCTION public.snapshot_daily_points(uuid, date) IS
  'Foto diaria: el día cierra antes de las 04:00 (hora de Dubái), celdas poseídas con tope de 20 pts, más bonus acumulados.';

-- apply_run actualizado para usar private.zone_day_key.
CREATE OR REPLACE FUNCTION public.apply_run(p_run_id uuid, p_efforts jsonb)
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

  -- Contar el día: el día cierra antes de las 04:00 (hora de Dubái).
  v_day := private.zone_day_key(v_uploaded, v_tz);
  PERFORM public.snapshot_daily_points(v_season, v_day);
  RETURN jsonb_build_object('events', v_events);
END;
$$;

REVOKE ALL ON FUNCTION public.apply_run(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_run(uuid, jsonb) TO service_role;

COMMENT ON FUNCTION public.apply_run(uuid, jsonb) IS
  'Aplica CellEffort[] a una carrera accepted. Bloquea la temporada y cada celda. Solo service_role.';

-- recompute_season actualizado para usar private.zone_day_key.
CREATE OR REPLACE FUNCTION public.recompute_season(p_season_id uuid)
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

  -- Al reproducir las carreras accepted, recompute_season recrea las baldosas
  -- en la liga anterior de usuarios ascendidos. Liberar las celdas poseídas al momento del ascenso:
  DELETE FROM public.cell_ownership AS o
  USING public.user_leagues AS ul,
        public.cell_efforts AS e,
        public.runs AS r
  WHERE ul.season_id = p_season_id
    AND ul.user_id = o.owner_id
    AND ul.reason = 'promotion'
    AND ul.league_id <> o.league_id
    AND e.id = o.effort_id
    AND r.id = e.run_id
    AND r.created_at <= ul.valid_from;

  SELECT zone.timezone
  INTO v_tz
  FROM public.seasons AS season
  JOIN public.zones AS zone ON zone.id = season.zone_id
  WHERE season.id = p_season_id;

  SELECT private.zone_day_key(season.starts_at, v_tz),
         private.zone_day_key(season.ends_at, v_tz)
  INTO v_from, v_to
  FROM public.seasons AS season
  WHERE season.id = p_season_id;

  v_to := LEAST(
    v_to,
    GREATEST(
      private.zone_day_key(now(), v_tz),
      COALESCE(
        (
          SELECT max(private.zone_day_key(event.created_at, v_tz))
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
