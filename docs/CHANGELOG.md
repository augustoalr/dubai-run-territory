# Changelog

## 0.2.2 — 2026-10-27

Parsers de carrera y fixtures de la pista. Sin cambios de base de datos ni del mapa.

- T-05: `scripts/make-fixture.ts` genera GPX y FIT sintéticos sobre el eje de Jumeirah · Kite. Una carrera por liga, bici a 30 km/h, salto de 500 m, pausa de 2 min, pico de GPS, fecha futura, menos de 1 km, duplicado, copia, GPX sin `<time>`, un FIT de carrera y un FIT de ciclismo. Cada uno tiene un `.json` con el resultado que tendrá que dar el antitrampas (estado, motivo y celdas). No hay datos personales ni FIT reales: esos los tiene que aportar Augusto.
- T-06: `parseGpx` en `packages/core` con `fast-xml-parser`. Lee lat, lon, tiempo, tipo y las extensiones de pulso y cadencia de Garmin, Strava y Apple Watch. Sin tiempo lanza `NO_TIMESTAMPS`.
- T-07: `parseFit` con `@garmin/fitsdk` 21.218.0 (`Decoder`, `Stream`, `isFIT`, `checkIntegrity`). Pasa semicírculos a grados, el deporte a `running` / `cycling` / `other` y la cadencia de carrera a pasos por minuto. Un FIT corrupto lanza `INVALID_FILE`.

## 0.2.1 — 2026-10-27

Advisors del proyecto ya migrado. Migración nueva, sin tocar las tres aplicadas.

- Las políticas que filtran por el corredor usan `(SELECT auth.uid())`.
- Índices para las claves ajenas que el advisor marcó sin cubrir: `cell_efforts.season_id`, `cell_ownership (zone_id, h3)`, `daily_points.league_id`, `daily_points.user_id`, `runs.season_id` y `user_leagues.season_id`.
- `is_admin()` pasa a `private.is_admin()`. El esquema `private` no entra en la API. `anon` no tiene `EXECUTE`.

## 0.2.0 — 2026-10-27

Esquema, RLS y seed de la zona.

- T-02: migraciones en `supabase/migrations/` para perfiles, zonas, celdas H3, temporadas, ligas, carreras, marcas, propiedad, puntos, reportes y conexiones de proveedor. PostGIS en el esquema `extensions`. RLS en todas las tablas. Tipos en `supabase/database.types.ts` (`supabase gen types`, CLI 2.122.0).
- Contrato `CellEffort` en `@dubai-run/core` para T-09 y T-12.
- T-04 (seed): `pnpm seed:sql` genera el SQL idempotente de Jumeirah · Kite (99 celdas), las 4 ligas y la temporada 1. La zona entra en `draft`.
- Fuentes de carrera: `upload`, `garmin`, `polar` y `browser`. `external_activity_id` es único por fuente. `provider_connections` guarda los tokens solo para `service_role`. Strava no entra en la fase 0.

## 0.1.0 — 2026-10-27

Base de la PWA.

- T-01 (adaptado): monorepo pnpm, `apps/web` en Next.js estático y `packages/core` sin DOM. ESLint, Prettier, Vitest y GitHub Actions (lint, typecheck, test, build). Manifest, iconos y service worker.
- T-03 (preparado, sin cuenta): export estático portable. Vercel Hobby mientras no haya ingresos; `docs/DEPLOY.md` deja listo el salto a Cloudflare Pages. Variables de Supabase de ejemplo, sin claves.
- T-04 (geometría, sin INSERT): polígono aproximado de Jumeirah · Kite desde OSM way 332925290, buffer de 25 m, **99 celdas** H3 resolución 10 con `containmentOverlapping`.
- T-16 (vista previa): mapa MapLibre + OpenFreeMap a pantalla completa, selector de liga y dueños de ejemplo. El worker se publica en `public/map/` para que Turbopack y Safari no lo pierdan. Todavía no lee `cell_ownership`.

Hosting anotado en `docs/ARQUITECTURA.md`: la decisión vigente es Vercel Hobby, con el build desacoplado de Vercel.
