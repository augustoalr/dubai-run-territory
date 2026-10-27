-- RLS y privilegios (T-02).
-- La anon key es el rol `anon`. El JWT de un corredor es `authenticated`.
-- service_role tiene BYPASSRLS en Supabase y es quien ejecuta la Edge Function.
--
-- Lectura pública: zones, zone_cells, leagues, seasons, cell_ownership,
-- daily_points y el alias de profiles.
-- runs y cell_efforts: solo el dueño; un admin lee todo.
-- cell_ownership no tiene política de escritura: ni anon ni authenticated insertan.
-- provider_connections no tiene ninguna política para el cliente. Los tokens
-- no salen del servidor.

CREATE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_admin
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zone_cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cell_efforts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cell_ownership ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ownership_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_connections ENABLE ROW LEVEL SECURITY;

-- Aunque alguien conceda GRANT después, el dueño de la tabla (si no tiene
-- BYPASSRLS) también queda sujeto a las políticas. No hay ninguna para el cliente.
ALTER TABLE public.provider_connections FORCE ROW LEVEL SECURITY;

CREATE POLICY zones_select_public ON public.zones
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY zone_cells_select_public ON public.zone_cells
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY leagues_select_public ON public.leagues
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY seasons_select_public ON public.seasons
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY cell_ownership_select_public ON public.cell_ownership
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY daily_points_select_public ON public.daily_points
  FOR SELECT TO anon, authenticated
  USING (true);

-- El alias es público. is_admin no está en el GRANT de columnas.
CREATE POLICY profiles_select_public ON public.profiles
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY user_leagues_select_own ON public.user_leagues
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY runs_select_own ON public.runs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- El cliente solo abre una subida pendiente. garmin, polar y browser los inserta
-- el servidor. external_activity_id queda vacío: deduplicar un proveedor no es
-- algo que el navegador pueda afirmar.
CREATE POLICY runs_insert_own_upload ON public.runs
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
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
    AND storage_path LIKE 'runs-raw/' || auth.uid()::text || '/%'
    AND EXISTS (
      SELECT 1
      FROM public.zones
      WHERE zones.id = zone_id
        AND zones.status = 'active'
    )
  );

CREATE POLICY cell_efforts_select_own ON public.cell_efforts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY ownership_events_select_involved ON public.ownership_events
  FOR SELECT TO authenticated
  USING (
    actor_id = auth.uid()
    OR prev_owner_id = auth.uid()
    OR public.is_admin()
  );

CREATE POLICY reports_select_own ON public.reports
  FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.is_admin());

CREATE POLICY reports_insert_own ON public.reports
  FOR INSERT TO authenticated
  WITH CHECK (
    reporter_id = auth.uid()
    AND status = 'open'
  );

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT ON public.zones, public.zone_cells, public.leagues, public.seasons,
  public.cell_ownership, public.daily_points
  TO anon, authenticated;

GRANT SELECT (id, alias, created_at) ON public.profiles TO anon, authenticated;
GRANT UPDATE (alias) ON public.profiles TO authenticated;

GRANT SELECT, INSERT ON public.runs TO authenticated;
GRANT SELECT ON public.cell_efforts TO authenticated;
GRANT SELECT ON public.user_leagues TO authenticated;
GRANT SELECT ON public.ownership_events TO authenticated;
GRANT SELECT, INSERT ON public.reports TO authenticated;

-- provider_connections: cero privilegios para anon y authenticated.
REVOKE ALL ON public.provider_connections FROM PUBLIC, anon, authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_profile() FROM PUBLIC, anon, authenticated;
