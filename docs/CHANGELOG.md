# Changelog

## 0.7.0 — 2026-10-31

Mapa de territorios interactivo (T-16).

- T-16: Mapa MapLibre GL con OpenFreeMap a pantalla completa centrado en la pista de Jumeirah–Kite Beach (99 celdas). 4 estados con paleta atlética moderna (Mía en naranja intenso `#FF5500`, Mía en peligro con borde exterior pulsante animado, De otro en gris neutro, Libre con contorno sin relleno). Soporte completo para modo oscuro y claro con conmutador rápido. Selector superior de ligas (con indicación de "Tu liga"). Leyenda flotante compacta. Tarjeta inferior (bottom sheet) al tocar cualquier celda mostrando iniciales, alias, ritmo legible (ej. 5:12 /km) y botón "Cómo robarla" con modal explicativo para corredores. Arquitectura modular con capa de repositorio desacoplada en `apps/web/src/lib/territory` lista para Supabase.

## 0.6.0 — 2026-10-29

Edge Function `process-run`, sin desplegar.

- T-13: `planRun` en `packages/core` decide estado, motivo, liga y si hay que llamar a `apply_run`. La función en `supabase/functions/process-run` solo lee la carrera (archivo en Storage o puntos ya parseados), escribe `runs` y, si toca, llama a `apply_run` con la service role. Si el estado ya es terminal o ya hay marcas, no repite. No se ha desplegado ni se ha escrito en el proyecto remoto.

## 0.5.0 — 2026-10-29

Motor de conquista en SQL. La migración no se ha aplicado en el Supabase remoto.

- T-12: `apply_run`, `recompute_season` y `snapshot_daily_points`. Robo solo si el ritmo redondeado es estrictamente menor; en empate se queda quien cruzó la celda antes (y, en el mismo instante, quien subió antes). Solo carreras `accepted` de la temporada activa, con inicio dentro de la temporada y subida en 72 h. El mapa es por liga. Los eventos son conquista, robo, mejora y defensa. La foto diaria suma las celdas del cierre del día, más 1 por conquista y 2 por robo. Funciones `SECURITY DEFINER` con `search_path` vacío, ejecutables solo por `service_role`. Casos en `docs/CONQUISTA.md`. `pnpm db:verify` los corre en local.

## 0.4.0 — 2026-10-29

Ligas: ritmo de referencia y ascensos. Sin cambios de base de datos ni del mapa.

- T-11: `bestKmWindow` es la mejor ventana de 1 km, redondeada a 1 s/km. `referencePaceS` se queda con la más rápida de los últimos 60 días. `resolveLeagueForRun` asigna la liga provisional en la primera carrera, asciende en el acto (también saltando ligas) y no baja a mitad de temporada. Al empezar temporada se recalcula con esos 60 días y entonces sí se puede bajar. Las bandas son las del seed: élite ≤ 254, avanzado 255–314, intermedio 315–374, inicial ≥ 375.

## 0.3.0 — 2026-10-29

Normalización, celdas y antitrampas. Sin cambios de base de datos ni del mapa.

- T-08: `normalize` ordena, quita duplicados y descarta picos de GPS (las dos patas cortas superan 12 m/s). Un salto de más de 100 m no borra lo que viene detrás: `clipToZone` lo parte en tramos, igual que una pausa de más de 30 s. El margen alrededor del polígono es 30 m.
- T-09: `computeCellEfforts` rellena el `CellEffort` que ya está en main (ventana de 1 km, `paceS` entero, `crossedAt` en ISO). En los extremos la ventana se corre hacia dentro. Un tramo de menos de 1 km no puntúa. La ida y vuelta se queda con la mejor marca.
- T-10: `checkRun` cumple el contrato de los `.json` de `fixtures/`. Bici declarada, fecha futura, subida pasadas 72 h, duplicado, copia, picos y densidad usan los motivos de ARQUITECTURA §6. Por debajo de 2:40/km, el patrón de bici y la cadencia rara van a revisión. Los umbrales están en `DEFAULT_ANTI_CHEAT`. La actividad normalizada lleva `source`: `upload`, `garmin`, `polar` o `browser` (`RunSource`).
- `AGENTS.md` y `docs/ESTADO.md`: reglas para cortes de créditos y el estado real de T-01 a T-10.

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
