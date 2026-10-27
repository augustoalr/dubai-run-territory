-- Esquema de Territorio (T-02). Postgres 17 + PostGIS en el esquema extensions.
-- El proyecto hospedado es dubai-run-territory (usduksotdecgusaxeyva).
-- auth.users ya existe en Supabase; el banco de pruebas local lo crea antes
-- (supabase/tests/harness.sql). No ejecutes ese harness en el proyecto real.
--
-- Strava no es una fuente ni un proveedor en la fase 0. Exportar un GPX desde
-- Strava y subirlo sigue siendo source = upload.

CREATE SCHEMA IF NOT EXISTS extensions;

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;

-- Fuentes de una carrera. 'browser' reserva la grabación en el navegador.
-- garmin y polar son importaciones del proveedor. upload es un archivo .gpx/.fit.
CREATE TYPE public.run_source AS ENUM ('upload', 'garmin', 'polar', 'browser');

-- Cuentas conectadas. Strava queda fuera a propósito: añadirlo será un ALTER TYPE.
CREATE TYPE public.activity_provider AS ENUM ('garmin', 'polar');

COMMENT ON TYPE public.run_source IS
  'Origen de la carrera. Strava no forma parte de la fase 0.';

COMMENT ON TYPE public.activity_provider IS
  'Proveedor con tokens en el servidor. Strava no está incluido.';

CREATE TABLE public.zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text NOT NULL CHECK (char_length(btrim(name)) > 0),
  polygon extensions.geography(Polygon, 4326) NOT NULL,
  h3_res integer NOT NULL CHECK (h3_res BETWEEN 0 AND 15),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  timezone text NOT NULL DEFAULT 'Asia/Dubai',
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.zones IS
  'Área de juego. La MVP jumeirah-kite entra en draft hasta que Augusto apruebe el polígono.';

CREATE TABLE public.zone_cells (
  zone_id uuid NOT NULL REFERENCES public.zones (id) ON DELETE CASCADE,
  h3 text NOT NULL CHECK (h3 ~ '^[0-9a-f]{15}$'),
  center extensions.geography(Point, 4326) NOT NULL,
  boundary extensions.geography(Polygon, 4326) NOT NULL,
  PRIMARY KEY (zone_id, h3)
);

COMMENT ON TABLE public.zone_cells IS
  'Celdas H3 precalculadas al crear la zona. Un punto cuya celda no está aquí se ignora.';

CREATE TABLE public.leagues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid REFERENCES public.zones (id) ON DELETE CASCADE,
  code text NOT NULL CHECK (code ~ '^[a-z0-9_]+$'),
  name text NOT NULL CHECK (char_length(btrim(name)) > 0),
  min_pace_s integer CHECK (min_pace_s IS NULL OR min_pace_s > 0),
  max_pace_s integer CHECK (max_pace_s IS NULL OR max_pace_s > 0),
  sort integer NOT NULL,
  CHECK (min_pace_s IS NULL OR max_pace_s IS NULL OR min_pace_s <= max_pace_s)
);

COMMENT ON TABLE public.leagues IS
  'Bandas de ritmo. zone_id nulo = liga global (PRODUCTO §3.7).';

COMMENT ON COLUMN public.leagues.min_pace_s IS
  'Límite lento inclusivo, en s/km. Nulo = no hay tope lento.';

COMMENT ON COLUMN public.leagues.max_pace_s IS
  'Límite rápido inclusivo, en s/km. Nulo = no hay tope rápido. Menor es más rápido.';

-- UNIQUE (zone_id, code) no distingue nulos: dos ligas globales podrían repetir code.
CREATE UNIQUE INDEX leagues_global_code_uidx
  ON public.leagues (code)
  WHERE zone_id IS NULL;

CREATE UNIQUE INDEX leagues_zone_code_uidx
  ON public.leagues (zone_id, code)
  WHERE zone_id IS NOT NULL;

CREATE INDEX leagues_zone_id_idx ON public.leagues (zone_id);

CREATE TABLE public.seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid NOT NULL REFERENCES public.zones (id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(btrim(name)) > 0),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'closed')),
  CHECK (ends_at > starts_at),
  UNIQUE (zone_id, name)
);

COMMENT ON TABLE public.seasons IS
  'Temporada de 3 semanas. Las fechas se guardan en UTC y se muestran en hora del Golfo.';

CREATE UNIQUE INDEX seasons_one_active_per_zone_uidx
  ON public.seasons (zone_id)
  WHERE status = 'active';

CREATE INDEX seasons_zone_id_idx ON public.seasons (zone_id);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  alias text,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_admin boolean NOT NULL DEFAULT false,
  CHECK (
    alias IS NULL
    OR (
      char_length(alias) BETWEEN 3 AND 20
      AND alias = btrim(alias)
      AND alias !~ '[[:cntrl:][:space:]]'
    )
  )
);

COMMENT ON TABLE public.profiles IS
  'Perfil público mínimo. El alias se elige en el primer login (T-14). is_admin no lo escribe el cliente.';

COMMENT ON COLUMN public.profiles.is_admin IS
  'Solo lo cambian postgres, service_role o un superusuario. El cliente no tiene GRANT sobre esta columna.';

CREATE UNIQUE INDEX profiles_alias_lower_uidx
  ON public.profiles (lower(alias))
  WHERE alias IS NOT NULL;

CREATE TABLE public.user_leagues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  season_id uuid NOT NULL REFERENCES public.seasons (id) ON DELETE CASCADE,
  league_id uuid NOT NULL REFERENCES public.leagues (id),
  ref_pace_s integer NOT NULL CHECK (ref_pace_s > 0),
  reason text NOT NULL CHECK (reason IN ('provisional', 'season_start', 'promotion')),
  valid_from timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_leagues IS
  'Historial de liga. No hay descenso a mitad de temporada: es otra fila, no un update.';

CREATE INDEX user_leagues_current_idx
  ON public.user_leagues (user_id, season_id, valid_from DESC);

CREATE INDEX user_leagues_league_id_idx ON public.user_leagues (league_id);

CREATE TABLE public.runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  zone_id uuid NOT NULL REFERENCES public.zones (id),
  season_id uuid REFERENCES public.seasons (id),
  storage_path text NOT NULL CHECK (char_length(storage_path) BETWEEN 1 AND 512),
  file_sha256 text NOT NULL CHECK (file_sha256 ~ '^[0-9a-fA-F]{64}$'),
  track_hash text,
  format text NOT NULL CHECK (format IN ('gpx', 'fit')),
  source public.run_source NOT NULL DEFAULT 'upload',
  -- Identificador de la actividad en el proveedor. Nulo en upload y browser.
  -- Único por source para no importar dos veces la misma actividad.
  external_activity_id text CHECK (
    external_activity_id IS NULL
    OR char_length(external_activity_id) BETWEEN 1 AND 200
  ),
  sport text CHECK (sport IS NULL OR sport IN ('running', 'cycling', 'other')),
  started_at timestamptz,
  ended_at timestamptz,
  distance_in_zone_m double precision CHECK (
    distance_in_zone_m IS NULL OR distance_in_zone_m >= 0
  ),
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'accepted', 'review', 'rejected', 'voided')
  ),
  reject_code text,
  flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  league_id uuid REFERENCES public.leagues (id),
  track_in_zone extensions.geography(LineString, 4326),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ended_at IS NULL OR started_at IS NULL OR ended_at >= started_at),
  UNIQUE (user_id, file_sha256)
);

COMMENT ON TABLE public.runs IS
  'Carrera subida o importada. track_in_zone es privado: solo el dueño y el admin, vía RLS.';

COMMENT ON COLUMN public.runs.source IS
  'upload = archivo elegido por el corredor (incluye un GPX exportado de Strava). garmin y polar = importación con provider_connections. browser = grabación futura en la PWA.';

COMMENT ON COLUMN public.runs.external_activity_id IS
  'Id de la actividad en el proveedor. Único junto con source. Vacío en upload y browser.';

CREATE UNIQUE INDEX runs_source_external_activity_uidx
  ON public.runs (source, external_activity_id)
  WHERE external_activity_id IS NOT NULL;

CREATE INDEX runs_user_started_idx ON public.runs (user_id, started_at);

CREATE INDEX runs_zone_season_status_idx ON public.runs (zone_id, season_id, status);

CREATE INDEX runs_league_id_idx ON public.runs (league_id);

CREATE INDEX runs_track_hash_idx ON public.runs (track_hash)
  WHERE track_hash IS NOT NULL;

CREATE INDEX runs_track_gix ON public.runs USING GIST (track_in_zone);

CREATE TABLE public.cell_efforts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.runs (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  zone_id uuid NOT NULL REFERENCES public.zones (id),
  season_id uuid NOT NULL REFERENCES public.seasons (id),
  league_id uuid NOT NULL REFERENCES public.leagues (id),
  h3 text NOT NULL CHECK (h3 ~ '^[0-9a-f]{15}$'),
  crossed_at timestamptz NOT NULL,
  pace_s integer NOT NULL CHECK (pace_s > 0),
  window_start_m double precision NOT NULL CHECK (window_start_m >= 0),
  window_end_m double precision NOT NULL,
  -- Ventana de 1 km de CellEffort (packages/core). Holgura de 1 mm por el float.
  CHECK (window_end_m - window_start_m BETWEEN 999.999 AND 1000.001),
  UNIQUE (run_id, h3),
  FOREIGN KEY (zone_id, h3) REFERENCES public.zone_cells (zone_id, h3)
);

COMMENT ON TABLE public.cell_efforts IS
  'Mejor marca de una celda en una carrera. apply_run (T-12) recibe un JSON CellEffort[]: h3, crossedAt, paceS, windowStartM, windowEndM. run_id, user_id, zone_id, season_id y league_id salen de la fila runs, no del JSON.';

CREATE INDEX cell_efforts_lookup_idx
  ON public.cell_efforts (zone_id, season_id, league_id, h3);

CREATE INDEX cell_efforts_user_idx ON public.cell_efforts (user_id, season_id);

CREATE INDEX cell_efforts_zone_cell_idx ON public.cell_efforts (zone_id, h3);

CREATE INDEX cell_efforts_league_id_idx ON public.cell_efforts (league_id);

CREATE TABLE public.cell_ownership (
  zone_id uuid NOT NULL REFERENCES public.zones (id),
  season_id uuid NOT NULL REFERENCES public.seasons (id),
  league_id uuid NOT NULL REFERENCES public.leagues (id),
  h3 text NOT NULL CHECK (h3 ~ '^[0-9a-f]{15}$'),
  owner_id uuid NOT NULL REFERENCES public.profiles (id),
  effort_id uuid NOT NULL REFERENCES public.cell_efforts (id),
  pace_s integer NOT NULL CHECK (pace_s > 0),
  achieved_at timestamptz NOT NULL,
  since timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (zone_id, season_id, league_id, h3),
  FOREIGN KEY (zone_id, h3) REFERENCES public.zone_cells (zone_id, h3)
);

COMMENT ON TABLE public.cell_ownership IS
  'Mapa derivado. Nadie escribe aquí con la anon key: solo funciones security definer (T-12) con la service key.';

CREATE INDEX cell_ownership_owner_idx ON public.cell_ownership (owner_id);

CREATE INDEX cell_ownership_effort_idx ON public.cell_ownership (effort_id);

CREATE INDEX cell_ownership_season_idx ON public.cell_ownership (season_id);

CREATE INDEX cell_ownership_league_idx ON public.cell_ownership (league_id);

CREATE TABLE public.ownership_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('conquest', 'steal', 'defend', 'improve')),
  zone_id uuid NOT NULL REFERENCES public.zones (id),
  h3 text NOT NULL CHECK (h3 ~ '^[0-9a-f]{15}$'),
  league_id uuid NOT NULL REFERENCES public.leagues (id),
  season_id uuid NOT NULL REFERENCES public.seasons (id),
  actor_id uuid NOT NULL REFERENCES public.profiles (id),
  prev_owner_id uuid REFERENCES public.profiles (id),
  run_id uuid NOT NULL REFERENCES public.runs (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (zone_id, h3) REFERENCES public.zone_cells (zone_id, h3)
);

COMMENT ON TABLE public.ownership_events IS
  'Feed, avisos y puntos. zone_id acompaña a h3 porque el índice se repite entre zonas.';

CREATE INDEX ownership_events_prev_owner_idx
  ON public.ownership_events (prev_owner_id, created_at);

CREATE INDEX ownership_events_actor_idx
  ON public.ownership_events (actor_id, created_at);

CREATE INDEX ownership_events_run_idx ON public.ownership_events (run_id);

CREATE INDEX ownership_events_zone_cell_idx ON public.ownership_events (zone_id, h3);

CREATE INDEX ownership_events_season_idx ON public.ownership_events (season_id);

CREATE INDEX ownership_events_league_idx ON public.ownership_events (league_id);

CREATE TABLE public.daily_points (
  season_id uuid NOT NULL REFERENCES public.seasons (id) ON DELETE CASCADE,
  league_id uuid NOT NULL REFERENCES public.leagues (id),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  day date NOT NULL,
  cells_owned integer NOT NULL CHECK (cells_owned >= 0),
  points integer NOT NULL CHECK (points >= 0),
  PRIMARY KEY (season_id, league_id, user_id, day)
);

COMMENT ON TABLE public.daily_points IS
  'Foto de las 23:59, hora del Golfo. La escribe el job; el cliente solo lee.';

CREATE INDEX daily_points_ranking_idx
  ON public.daily_points (season_id, league_id, day, points DESC);

CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.runs (id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 3 AND 500),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, reporter_id)
);

COMMENT ON TABLE public.reports IS
  'Reporte de una carrera. Lo crea el usuario; el admin lo cierra.';

CREATE INDEX reports_reporter_idx ON public.reports (reporter_id);

CREATE TABLE public.provider_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  provider public.activity_provider NOT NULL,
  tokens jsonb NOT NULL CHECK (jsonb_typeof(tokens) = 'object'),
  connected_at timestamptz NOT NULL DEFAULT now(),
  disconnected_at timestamptz,
  CHECK (disconnected_at IS NULL OR disconnected_at >= connected_at),
  UNIQUE (user_id, provider)
);

COMMENT ON TABLE public.provider_connections IS
  'Cuenta de Garmin o Polar. Sin políticas para anon ni authenticated: la service key es el único acceso. Strava no tiene fila posible en la fase 0.';

COMMENT ON COLUMN public.provider_connections.tokens IS
  'Secretos del proveedor (access_token, refresh_token, expires_at). No hay GRANT ni política RLS para el cliente. Al desconectar, el servidor debe vaciar este objeto.';

CREATE INDEX zones_polygon_gix ON public.zones USING GIST (polygon);

CREATE INDEX zone_cells_boundary_gix ON public.zone_cells USING GIST (boundary);

CREATE INDEX zone_cells_center_gix ON public.zone_cells USING GIST (center);

-- Perfil al crear el usuario de Auth. En el proyecto real auth.users ya dispara esto.
CREATE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- is_admin no se cambia con la anon key ni con el JWT del corredor.
CREATE FUNCTION public.protect_profile()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  privileged boolean;
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'profiles.id is immutable' USING ERRCODE = '42501';
  END IF;
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'profiles.created_at is immutable' USING ERRCODE = '42501';
  END IF;
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    SELECT
      rolsuper
      OR rolbypassrls
      OR rolname IN ('postgres', 'service_role', 'supabase_admin')
    INTO privileged
    FROM pg_catalog.pg_roles
    WHERE rolname = current_user;
    IF NOT COALESCE(privileged, false) THEN
      RAISE EXCEPTION 'is_admin is reserved' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_profile() FROM PUBLIC;

CREATE TRIGGER profiles_protect
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile();
