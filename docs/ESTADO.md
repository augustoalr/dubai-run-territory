# Estado de la Fase 0

Actualizado el 29 oct 2026, con main en `3955f66` (PR #7).

Al retomar: lee este archivo y actualiza la rama con `main` antes de seguir. El trabajo de código en curso es **T-16**.

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

- **Estado:** hecho.
- **Hecho:** `bestKmWindow`, `referencePaceS` (60 días) y `resolveLeagueForRun`. Primera carrera provisional, ascenso inmediato, sin descenso a mitad de temporada, recálculo al inicio de temporada. Bandas iguales al seed. PR #6.
- **Pendiente:** nada de esta tarea.
- **Siguiente paso:** ninguno.

## T-12 · Conquista

- **Estado:** hecho. Migración `20261029160000_apply_run` aplicada en Supabase (squash `3955f66`).
- **Hecho:** `apply_run`, `recompute_season` y `snapshot_daily_points`. PR #7.
- **Pendiente:** nada de esta tarea.
- **Siguiente paso:** ninguno.

## T-13 · process-run

- **Estado:** hecho en código (PR #8 fusionado en `main`). La función NO está desplegada.
- **Hecho:** `planRun` y `historyContext` en `packages/core`. La función exige el JWT del dueño o la service role (si no, 403). `uploadedAt` es `runs.created_at`. El contexto trae hashes, solapes y el conteo del día del propio usuario (60 días); el ritmo de referencia sale de sus marcas. Un fallo al insertar `user_leagues` se escribe en el log. `knownTracks` sigue vacío: `COPIED_TRACK` no salta.
- **Pendiente:** la función NO está desplegada (lo hace SWE, no ejecutar `supabase functions deploy`). Falta el informe de CPU de un FIT de 3 h.
- **Siguiente paso:** si `verify` falla, corregir solo ese fallo. No ejecutar `supabase functions deploy` (lo hace SWE).

## T-16 · Mapa de territorios

- **Estado:** hecho (PR #9 fusionado en `main`).
- **Hecho:** mapa MapLibre GL con OpenFreeMap a pantalla completa sobre las 99 baldosas de Jumeirah–Kite Beach. 4 estados visuales claros (Mía en naranja intenso, Mía en peligro con animación de borde que late solo si hay baldosas amenazadas y limitada a 15 fps respetando accesibilidad y batería, De otro en gris, Libre solo contorno). Soporte para modo oscuro y claro con `map.setStyle` sin recargar el mapa, usando estilos locales consistentes. Leyenda compacta fija. Selector de ligas superior con preselección de la liga del corredor. Tarjeta inferior (bottom sheet) con avatar e iniciales del dueño, ritmo formateado (ej. 5:12 /km) y botón "Cómo robarla" con guía paso a paso libre de tecnicismos. Capa de datos y repositorio desacoplado en `apps/web/src/lib/territory/` listo para conectar con Supabase.
- **Pendiente:** conectar con la base de datos remota una vez completada la autenticación.
- **Siguiente paso:** ninguno.

## T-21 · Páginas legales

- **Estado:** hecho (PR #10 y PR #11 fusionados en `main`).
- **Hecho:** páginas `/privacidad` y `/terminos` en Next.js estático (`apps/web`), bilingües (español e inglés) con conmutador instantáneo y diseño adaptado a móvil usando los tokens del sistema visual (modo oscuro/claro y tipografías Oswald y Outfit). Ambas páginas llevan en lo alto el aviso destacado "Borrador pendiente de revisión legal" ("Draft pending legal review"). En `/privacidad` se explica con lenguaje claro los datos almacenados (alias, email, carreras con GPS y ritmos), la finalidad del juego y las ligas, que nunca se publican horarios ni puntos de inicio/fin, que provienen de Garmin, Polar o app solo si se conectan, almacenamiento privado del archivo original exclusivamente para verificar y detectar trampas, quién guarda tus datos (Supabase y Vercel) sin venta ni publicidad, el derecho a borrar la cuenta y los datos en cualquier momento, edad mínima de 16 años, y el correo de contacto `privacidad@PENDIENTE`. En `/terminos` se estipula que es un juego gratuito, que el usuario corre bajo su propia responsabilidad respetando las normas y el tráfico de Dubái, edad mínima de 16 años, la prohibición estricta de trampas (vehículos a motor/ruedas, compartir cuentas, falsear GPS) y la potestad de anular carreras sospechosas y sancionar cuentas. Se han integrado enlaces en el menú superior de la app (`TerritoryHeader` -> `AppMenuModal`) y en el pie de la pantalla (`MapLegend`).
- **Pendiente:** correo de contacto real en vez de `privacidad@PENDIENTE` y validación jurídica.
- **Siguiente paso:** ninguno.

## T-25 · Grabar carrera en la app (PWA)

- **Estado:** en progreso (rama `t25-grabar`).
- **Hecho:** nueva página `/grabar` en `apps/web` con botón grande "Empezar carrera", seguimiento GPS en alta precisión (`watchPosition`), Wake Lock para mantener encendida la pantalla con aviso sencillo ("Deja la pantalla encendida mientras corres"), visualización en tiempo real de tiempo transcurrido, distancia y ritmo actual en formato "5:12 /km", y botón "Terminar". Al finalizar, persistencia local en el teléfono con IndexedDB en formato GPX y vista de resumen (distancia, tiempo y ritmo medio) con descarga opcional de GPX y retorno al mapa. Lógica pura en `packages/core`: filtrado de puntos (descarte de precisión > 30 m y saltos imposibles > 12 m/s), cálculo de métricas de ritmo y distancia, y constructor de GPX 1.1 con tests unitarios que verifican que el GPX producido es interpretado correctamente por `parseGpx`. Diseño atlético en español sin tecnicismos (sin mención a H3 ni a s/km).
- **Pendiente:** prueba de campo con teléfono real corriendo en la pista de Jumeirah–Kite.
- **Siguiente paso:** revisión de SWE y merge del PR hacia `main`.

## En curso

| Tarea | PR         | Siguiente paso exacto |
| ----- | ---------- | --------------------- |
| T-25  | t25-grabar | Revisión de SWE       |
