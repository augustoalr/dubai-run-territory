-- Advisors de Supabase, después de las tres migraciones ya aplicadas.
-- No reescribe el historial: solo añade índices, reescribe políticas y
-- saca is_admin() del esquema que publica PostgREST.

-- El esquema private no está en [api].schemas ni en extra_search_path.
-- PostgREST no lo expone en /rest/v1/rpc aunque authenticated pueda
-- ejecutar la función desde una política RLS.
CREATE SCHEMA private;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA private
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

CREATE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND is_admin
  );
$$;

REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated, service_role;

COMMENT ON SCHEMA private IS
  'Fuera de la API. No añadir este esquema a [api].schemas ni a extra_search_path.';

COMMENT ON FUNCTION private.is_admin() IS
  'Lee profiles.is_admin como el dueño de la función. authenticated la usa dentro de las políticas; no es un RPC.';

-- (SELECT auth.uid()) se evalúa una vez por consulta, no por fila.
DROP POLICY profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY user_leagues_select_own ON public.user_leagues;
CREATE POLICY user_leagues_select_own ON public.user_leagues
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT private.is_admin()));

DROP POLICY runs_select_own ON public.runs;
CREATE POLICY runs_select_own ON public.runs
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT private.is_admin()));

DROP POLICY runs_insert_own_upload ON public.runs;
CREATE POLICY runs_insert_own_upload ON public.runs
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND status = 'pending'
    AND source = 'upload'::public.run_source
    AND external_activity_id IS NULL
    AND season_id IS NULL
    AND league_id IS NULL
    AND sport IS NULL
    AND started_at IS NULL
    AND ended_at IS NULL
    AND distance_in_zone_m IS NULL
    AND track_hash IS NULL
    AND reject_code IS NULL
    AND track_in_zone IS NULL
    AND flags = '{}'::jsonb
    AND storage_path LIKE 'runs-raw/' || (SELECT auth.uid())::text || '/%'
    AND EXISTS (
      SELECT 1
      FROM public.zones
      WHERE zones.id = zone_id
        AND zones.status = 'active'
    )
  );

DROP POLICY cell_efforts_select_own ON public.cell_efforts;
CREATE POLICY cell_efforts_select_own ON public.cell_efforts
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT private.is_admin()));

DROP POLICY ownership_events_select_involved ON public.ownership_events;
CREATE POLICY ownership_events_select_involved ON public.ownership_events
  FOR SELECT TO authenticated
  USING (
    actor_id = (SELECT auth.uid())
    OR prev_owner_id = (SELECT auth.uid())
    OR (SELECT private.is_admin())
  );

DROP POLICY reports_select_own ON public.reports;
CREATE POLICY reports_select_own ON public.reports
  FOR SELECT TO authenticated
  USING (reporter_id = (SELECT auth.uid()) OR (SELECT private.is_admin()));

DROP POLICY reports_insert_own ON public.reports;
CREATE POLICY reports_insert_own ON public.reports
  FOR INSERT TO authenticated
  WITH CHECK (
    reporter_id = (SELECT auth.uid())
    AND status = 'open'
  );

DROP FUNCTION public.is_admin();

-- Prefijo izquierdo de un índice, que es lo que el advisor de FKs reconoce.
CREATE INDEX cell_efforts_season_id_idx ON public.cell_efforts (season_id);
CREATE INDEX cell_ownership_zone_h3_idx ON public.cell_ownership (zone_id, h3);
CREATE INDEX daily_points_league_id_idx ON public.daily_points (league_id);
CREATE INDEX daily_points_user_id_idx ON public.daily_points (user_id);
CREATE INDEX runs_season_id_idx ON public.runs (season_id);
CREATE INDEX user_leagues_season_id_idx ON public.user_leagues (season_id);
