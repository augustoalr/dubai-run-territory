# Estado de la Fase 0

Actualizado el 29 oct 2026, con main en `e01a262` (PR #3, squash).

Al retomar: lee este archivo y actualiza la rama con `main` antes de seguir. El siguiente trabajo de código es **T-11**, y solo cuando el PR #5 esté verde y mergeado.

## T-01 · Scaffolding

- **Estado:** hecho (adaptado).
- **Hecho:** monorepo pnpm, `apps/web` en Next.js estático (no Vite), `packages/core` sin DOM, ESLint, Prettier, Vitest y GitHub Actions. Manifest, iconos y service worker. PR #1.
- **Pendiente:** nadie ha instalado la PWA en un Safari de iOS real.
- **Siguiente paso:** ninguno de código. Cuando haya un teléfono a mano, abrir la URL de producción y comprobar que se puede añadir a la pantalla de inicio.

## T-02 · Esquema y RLS

- **Estado:** hecho.
- **Hecho:** migraciones de ARQUITECTURA §4, PostGIS, RLS, índices del advisor y `private.is_admin()`. Tipos en `supabase/database.types.ts`. CI corre `pnpm db:verify` contra PostGIS. PR #2 y PR #4.
- **Pendiente:** nada de esta tarea.
- **Siguiente paso:** ninguno.

## T-03 · Deploy

- **Estado:** parcial.
- **Hecho:** export estático. `docs/DEPLOY.md` deja Vercel Hobby como destino mientras no haya ingresos, y Cloudflare Pages para cuando se cobre. Variables `NEXT_PUBLIC_SUPABASE_*` documentadas, sin claves en git.
- **Pendiente:** no hay una URL pública comprobada desde este repo, ni preview por PR.
- **Siguiente paso:** importar el repo en Vercel Hobby (Root Directory `apps/web`) y anotar aquí la URL cuando responda. No hace falta cuenta de Cloudflare todavía.

## T-04 · Zona y seed

- **Estado:** parcial.
- **Hecho:** polígono aproximado de Jumeirah · Kite (OSM way 332925290, buffer 25 m, **99** celdas H3 res 10). `pnpm zone:cells` y `pnpm seed:sql`. Seed idempotente con 4 ligas y temporada 1. La zona entra en `draft`.
- **Pendiente:** Augusto no ha aprobado el polígono con una carrera real. No hay captura de esa aprobación.
- **Siguiente paso:** no mover el polígono. Cuando Augusto corra la pista, comparar el track con el eje y, si hace falta, regenerar con `pnpm zone:cells` y `pnpm seed:sql`.

## T-05 · Fixtures

- **Estado:** hecho, con un hueco conocido.
- **Hecho:** `pnpm fixtures` genera 15 GPX/FIT sintéticos sobre el eje y su `.json` (estado, motivo, celdas). Una carrera por liga, bici, salto de 500 m, pausa de 2 min, pico, fecha futura, &lt; 1 km, duplicado, copia y GPX sin `<time>`. PR #3.
- **Pendiente:** 1 o 2 FIT reales anonimizados de Augusto, recortados a la zona y sin el tramo de casa.
- **Siguiente paso:** cuando Augusto pase esos FIT, copiarlos a `fixtures/`, añadir el `.json` gemelo y un test. No inventar un archivo de reloj.

## T-06 · Parser GPX

- **Estado:** hecho en Node.
- **Hecho:** `parseGpx` con `fast-xml-parser`, sin DOM. Lat, lon, tiempo, deporte y extensiones de pulso y cadencia. Sin `<time>` lanza `NO_TIMESTAMPS`. El GPX de 3 h a 1 Hz queda por debajo de 300 ms. PR #3.
- **Pendiente:** no hay job de Deno en la CI.
- **Siguiente paso:** ninguno, salvo que se añada un smoke de Deno en una tarea aparte. El código no usa DOM ni `node:fs`.

## T-07 · Parser FIT

- **Estado:** hecho en Node, con FIT sintético.
- **Hecho:** `parseFit` con `@garmin/fitsdk` 21.218.0 (`isFIT` y `checkIntegrity`). Semicírculos a grados. Deporte `running` | `cycling` | `other`. Cadencia de carrera en pasos/min. FIT corrupto: `INVALID_FILE`. PR #3.
- **Pendiente:** el FIT real de T-05. Deno, igual que en T-06.
- **Siguiente paso:** ninguno hasta el FIT de Augusto. Un FIT `generic` queda en `other` y dobla la cadencia; si eso no vale, se cambia en una tarea pequeña con un test.

## T-08 · Normalización y recorte

- **Estado:** en el PR #5, rama ya rebasada sobre main (`e01a262`). El CI de esa punta es el que tiene que quedar verde.
- **Hecho:** `normalize` y `clipToZone` en `packages/core/src/track/normalize.ts`. El salto de 500 m y la pausa de 2 min salen en 2 tramos; el pico se elimina; no queda ningún punto fuera del polígono más 30 m. Cobertura del módulo: 100 % de líneas y 93 % de ramas.
- **Pendiente:** merge del PR #5.
- **Siguiente paso:** si el job `verify` del PR #5 falla, corregir solo ese fallo, commit y push. No empezar otra tarea encima.

## T-09 · Marcas por celda

- **Estado:** en el PR #5, junto con T-08 y T-10.
- **Hecho:** `computeCellEfforts` devuelve el `CellEffort` que ya está en main (no se redefinió). Ventana de 1 km, `paceS` entero, `crossedAt` ISO. La carrera de 5:00/km cae en 300 ± 3 s/km. Menos de 1 km no puntúa. La ida y vuelta guarda la marca más rápida. Se ignoran celdas ajenas a `zoneCells`.
- **Pendiente:** merge del PR #5.
- **Siguiente paso:** el mismo que T-08. No hace falta otro PR para T-09.

## T-10 · Antitrampas

- **Estado:** en el PR #5, junto con T-08 y T-09.
- **Hecho:** `checkRun` y `DEFAULT_ANTI_CHEAT`. Cada fixture da el `status`, el `reason` y el `approxCells` de su `.json`. Duplicados, copias, tope diario, 72 h y temporada entran por `context`. Hay `track_hash`. La actividad normalizada lleva `source` (`upload` | `garmin` | `polar` | `browser`), el `RunSource` ya existente.
- **Pendiente:** merge del PR #5. Aprobar a mano una revisión para que vuelva a puntuar no está en este módulo.
- **Siguiente paso:** el mismo que T-08. Después del merge, la tarea de código que toca es T-11 (`bestKmWindow`, `assignLeague`, `resolveLeagueForRun`), en una rama nueva desde `main`.

## En curso

| Tarea            | PR  | Siguiente paso exacto                                                                  |
| ---------------- | --- | -------------------------------------------------------------------------------------- |
| T-08, T-09, T-10 | #5  | Dejar el `verify` verde. El diff ya es solo esta tarea más `AGENTS.md` y este archivo. |
