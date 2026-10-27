# Changelog

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
