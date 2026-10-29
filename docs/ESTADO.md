# Estado de la Fase 0

Actualizado el 29 oct 2026, con main en `e16ed39` (PR #5).

Al retomar: lee este archivo y actualiza la rama con `main` antes de seguir. El trabajo de código en curso es **T-11** (PR de ligas). Después, T-12.

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

- **Estado:** hecho.
- **Hecho:** `pnpm fixtures` genera 15 GPX/FIT sintéticos sobre el eje y su `.json` (estado, motivo, celdas). Una carrera por liga, bici, salto de 500 m, pausa de 2 min, pico, fecha futura, menos de 1 km, duplicado, copia y GPX sin `<time>`. PR #3.
- **Pendiente:** 1 o 2 FIT reales anonimizados de Augusto, recortados a la zona y sin el tramo de casa. No bloquea T-11.
- **Siguiente paso:** cuando Augusto pase esos FIT, copiarlos a `fixtures/`, añadir el `.json` gemelo y un test. No inventar un archivo de reloj.

## T-06 · Parser GPX

- **Estado:** hecho.
- **Hecho:** `parseGpx` con `fast-xml-parser`, sin DOM. Lat, lon, tiempo, deporte y extensiones de pulso y cadencia. Sin `<time>` lanza `NO_TIMESTAMPS`. El GPX de 3 h a 1 Hz queda por debajo de 300 ms. PR #3.
- **Pendiente:** no hay job de Deno en la CI.
- **Siguiente paso:** ninguno.

## T-07 · Parser FIT

- **Estado:** hecho.
- **Hecho:** `parseFit` con `@garmin/fitsdk` 21.218.0 (`isFIT` y `checkIntegrity`). Semicírculos a grados. Deporte `running` | `cycling` | `other`. Cadencia de carrera en pasos/min. FIT corrupto: `INVALID_FILE`. PR #3.
- **Pendiente:** el FIT real de T-05. Deno, igual que en T-06.
- **Siguiente paso:** ninguno hasta el FIT de Augusto.

## T-08 · Normalización y recorte

- **Estado:** hecho.
- **Hecho:** `normalize` y `clipToZone` en `packages/core/src/track/normalize.ts`. El salto de 500 m y la pausa de 2 min salen en 2 tramos; el pico se elimina; no queda ningún punto fuera del polígono más 30 m. Cobertura del módulo: 100 % de líneas y 93 % de ramas. PR #5.
- **Pendiente:** nada de esta tarea.
- **Siguiente paso:** ninguno.

## T-09 · Marcas por celda

- **Estado:** hecho.
- **Hecho:** `computeCellEfforts` devuelve el `CellEffort` de main. Ventana de 1 km, `paceS` entero, `crossedAt` ISO. La carrera de 5:00/km cae en 300 ± 3 s/km. Menos de 1 km no puntúa. La ida y vuelta guarda la marca más rápida. PR #5.
- **Pendiente:** nada de esta tarea.
- **Siguiente paso:** ninguno.

## T-10 · Antitrampas

- **Estado:** hecho.
- **Hecho:** `checkRun` y `DEFAULT_ANTI_CHEAT`. Cada fixture da el `status`, el `reason` y el `approxCells` de su `.json`. Duplicados, copias, tope diario, 72 h y temporada entran por `context`. Hay `track_hash`. `source` es `upload` | `garmin` | `polar` | `browser`. PR #5.
- **Pendiente:** aprobar a mano una revisión para que vuelva a puntuar no está en este módulo.
- **Siguiente paso:** ninguno de esta tarea.

## T-11 · Ligas

- **Estado:** en esta rama (`cursor/league-pace-b408`), a la espera del CI.
- **Hecho:** `bestKmWindow`, `referencePaceS` (60 días) y `resolveLeagueForRun`. Primera carrera provisional, ascenso inmediato, sin descenso a mitad de temporada, recálculo al inicio de temporada. Bandas iguales al seed (élite ≤ 254, avanzado 255–314, intermedio 315–374, inicial ≥ 375).
- **Pendiente:** merge del PR cuando `verify` pase.
- **Siguiente paso:** si `verify` falla, corregir solo ese fallo, commit y push. No abrir T-12 en esta rama.

## En curso

| Tarea | PR  | Siguiente paso exacto                                          |
| ----- | --- | -------------------------------------------------------------- |
| T-11  | —   | Abrir el PR contra main y dejar el `verify` verde. Luego T-12. |
