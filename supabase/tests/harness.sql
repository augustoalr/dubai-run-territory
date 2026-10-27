-- Banco de pruebas local (pnpm db:verify). NO aplicar en el proyecto Supabase.
-- Crea el mínimo de auth.uid(), auth.users y los roles anon / authenticated /
-- service_role para poder ejercer las políticas. En el proyecto real ya existen.
-- También quita el PostGIS que la imagen Docker instala en public, para que la
-- migración lo cree en el esquema extensions, igual que el proyecto hospedado.

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY
);

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
END
$$;

ALTER ROLE anon NOLOGIN NOINHERIT;
ALTER ROLE authenticated NOLOGIN NOINHERIT;
ALTER ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;

GRANT anon, authenticated, service_role TO CURRENT_USER;

DROP EXTENSION IF EXISTS postgis_tiger_geocoder CASCADE;
DROP EXTENSION IF EXISTS postgis_topology CASCADE;
DROP EXTENSION IF EXISTS postgis CASCADE;
