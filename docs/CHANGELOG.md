# Changelog

## 0.10.0 — 2026-10-31

Pantalla "Mis carreras" local (T-15) y reglas de conquista según revisión de producto (T-27).

- T-15: Nueva pantalla `/carreras` en `apps/web` con la lista de carreras guardadas en el teléfono (IndexedDB), ordenadas cronológicamente (la más reciente primero).
- Cada tarjeta muestra fecha y hora formateadas, distancia (`km`), duración (`mm:ss`) y ritmo medio en formato `"5:12 /km"`.
- Al tocar una carrera se despliega un visor modal detallado con mini mapa interactivo de la ruta (MapLibre GL con ajuste automático de vista y respaldo SVG ligero si no hay aceleración gráfica), métricas completas, botón para descargar el archivo de la carrera y acción de borrado con ventana de confirmación previa.
- Vista de bienvenida para corredores sin actividad registrada con mensaje amable y botón principal hacia `/grabar` ("Grabar mi primera carrera").
- Opción avanzada al final de la pantalla para importar archivos de reloj deportivo (`.gpx` y `.fit`), validando la integridad con los parsers de `packages/core` y mostrando mensajes de error en lenguaje claro si el archivo está corrupto.
- Acceso directo a `/carreras` desde el resumen posterior a la grabación en `/grabar` y desde el grupo de botones flotantes sobre el mapa de la pista.
- Corrección en la descripción de la página `/grabar` eliminando la referencia técnica a "track GPX" y garantizando que no se muestren términos técnicos ("H3", "s/km", ni "GPX" fuera de la opción avanzada).
- T-27: Nueva migración SQL `supabase/migrations/20261031170000_conquest_rules_review.sql` (no aplicada en base de datos remota) que aplica las cuatro decisiones de la revisión de producto:
  1. El día cierra antes de las 04:00 (hora de Dubái) (en lugar de medianoche) en `snapshot_daily_points`, `apply_run`, `recompute_season` y la función auxiliar `private.zone_day_key`.
  2. Debilitamiento: si el dueño no ha vuelto a correr una baldosa en 7 días, su tiempo empeora 5 s/km por día, hasta un máximo de 60 s/km. Superar ese tiempo debilitado es necesario para robarla (en empate defiende el dueño actual).
  3. Tope de 20 puntos diarios por baldosas poseídas (+1 por conquista y +2 por robo siguen aparte).
  4. Al ascender de liga (`reason = 'promotion'`), se liberan las baldosas que la persona tenía en su liga anterior mediante trigger `user_league_promoted` en `user_leagues`.
- Mantén la seguridad actual: funciones `SECURITY DEFINER` con `search_path = ''` y acceso exclusivo para `service_role`.
- Funciones puras de dominio en `packages/core/src/ownership/` (`day.ts` y `decide.ts`).
- Tests completos en `packages/core/src/ownership/rules.test.ts` y validación SQL en `scripts/verify-db.ts` cubriendo los casos límite: día 7 contra día 8, tope de 60, exactamente 20 puntos, empate, el día cierra antes de las 04:00 (hora de Dubái) y liberación de baldosas al ascender.

## 0.9.0 — 2026-10-31

Grabación de carrera en la app PWA en local (T-25).

- T-25: Grabación local de carrera en el teléfono sin servidor. Nueva ruta `/grabar` en `apps/web` con botón grande "Empezar carrera", captura continua de ubicación GPS en alta precisión (`watchPosition`) y visualización en vivo de tiempo transcurrido, distancia recorrida y ritmo actual en formato "5:12 /km". Botón "Terminar" para concluir la sesión.
- Integración de Screen Wake Lock para mantener la pantalla encendida durante la carrera y aviso visible en lenguaje directo: "Deja la pantalla encendida mientras corres".
- Lógica pura y agnóstica de UI en `packages/core`: filtrado de puntos descartando precisión deficiente (> 30 m) y saltos imposibles (> 12 m/s), cálculo de métricas de distancia y ritmo (actual y medio) y constructor de archivos GPX estándar 1.1.
- Cobertura de tests unitarios completa en `packages/core`, verificando el descarte de anomalías de GPS y que el archivo GPX generado es parseado e interpretado correctamente por `parseGpx`.
- Persistencia local en el dispositivo del usuario mediante IndexedDB en formato GPX y pantalla de resumen final con distancia, tiempo y ritmo medio, descarga opcional del GPX y botón de regreso al mapa.
- Diseño consistente con la identidad atlética del mapa (modo oscuro/claro, tokens semánticos, tipografía Oswald y Outfit) y lenguaje cercano libre de tecnicismos (sin menciones a H3 ni s/km).

## 0.8.0 — 2026-10-31

Páginas legales: privacidad y términos (T-21).

- T-21: Páginas estáticas `/privacidad` y `/terminos` en `apps/web`, disponibles en español e inglés con conmutador dinámico y diseño responsivo móvil usando la identidad visual de la aplicación (tokens de color, glassmorphism, tipografía Oswald y Outfit, y soporte para modo oscuro y claro).
- Aviso superior "Borrador pendiente de revisión legal" ("Draft pending legal review") en ambas páginas.
- `/privacidad`: Explicación en lenguaje transparente sobre datos guardados (alias, email, GPS y ritmos), propósito del juego y las ligas, garantía de que nunca se muestran horarios ni puntos de inicio/fin de carrera, origen voluntario de los datos (Garmin, Polar o grabación en la app) y derecho al borrado permanente de cuenta y datos con correo de contacto `privacidad@PENDIENTE`.
- `/terminos`: Juego 100% gratuito, responsabilidad del participante cumpliendo la normativa de tráfico y seguridad vial de Dubái, política de tolerancia cero frente a trampas (vehículos de motor o ruedas, cuentas compartidas, manipulación GPS) y potestad para anular carreras sospechosas y suspender cuentas.
- Enlaces de acceso integrados en el pie del mapa (`MapLegend`) y en el menú principal de la aplicación (`TerritoryHeader` -> `AppMenuModal`).

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
