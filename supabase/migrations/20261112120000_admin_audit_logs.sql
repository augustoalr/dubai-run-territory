-- Registro de auditoría de moderación administrativa (T-18).
-- Solo service_role escribe aquí (desde la Edge Function admin-review).
-- Los administradores autenticados pueden leer vía RLS (private.is_admin()).

CREATE TABLE public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  action text NOT NULL CHECK (
    action IN ('approve_run', 'void_run', 'dismiss_report', 'resolve_report')
  ),
  target_type text NOT NULL CHECK (target_type IN ('run', 'report')),
  target_id uuid NOT NULL,
  reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 3 AND 500),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.admin_audit_logs IS
  'Historial inmutable de acciones del panel /admin. Solo escribe service_role.';

CREATE INDEX admin_audit_logs_admin_id_idx ON public.admin_audit_logs (admin_id);

CREATE INDEX admin_audit_logs_created_at_idx ON public.admin_audit_logs (created_at DESC);

CREATE INDEX admin_audit_logs_target_idx
  ON public.admin_audit_logs (target_type, target_id, created_at DESC);

CREATE INDEX reports_status_created_idx ON public.reports (status, created_at DESC);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.admin_audit_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.admin_audit_logs TO authenticated;
GRANT ALL ON TABLE public.admin_audit_logs TO service_role;

CREATE POLICY admin_audit_logs_select_admin ON public.admin_audit_logs
  FOR SELECT TO authenticated
  USING ((SELECT private.is_admin()));
