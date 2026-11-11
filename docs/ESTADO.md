# Estado de la Fase 0

Actualizado el 11 nov 2026, con main en `78f903d` (T-33 en PR #22 fusionado en `78f903d`; T-17 en PR #21 fusionado en `f8fc6bf`; T-32 en `76b2bdf` y T-14 en `4298309`, push directo a main sin PR propio; también PR #20, #17, #18, #19).

Al retomar: lee este archivo y actualiza la rama con `main` antes de seguir. Tarea en curso: T-34 (Conexión del mapa de territorios a Supabase) en rama `t34-mapa-supabase`. El playbook del manager está en `docs/MANAGER.md`.

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

- **Estado:** terminada.
- **Hecho:** export estático. `docs/DEPLOY.md` deja Vercel Hobby como destino mientras no haya ingresos, y Cloudflare Pages para cuando se cobre. Variables `NEXT_PUBLIC_SUPABASE_*` documentadas, sin claves en git.
- **Pendiente:** ninguno.
- **Siguiente paso:** ninguno.

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
- **Hecho:** `parseGpx` con `fast-xml-parser`, sin DOM. Lat, lon, tiempo, deporte y extensiones de pulso y cadencia. Sin `<time>` lanza `NO_TIMESTAMPS`. El GPX de 3 h a 1 Hz queda por debajo de 300 ms (el umbral de `gpx.test` en Windows pasó de 500 a 750 ms). PR #3.
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
- **Pendiente:** conexión con la base de datos remota completada en T-34.
- **Siguiente paso:** ninguno (ver T-34).

## T-21 · Páginas legales

- **Estado:** hecho (PR #10 y PR #11 fusionados en `main`).
- **Hecho:** páginas `/privacidad` y `/terminos` en Next.js estático (`apps/web`), bilingües (español e inglés) con conmutador instantáneo y diseño adaptado a móvil usando los tokens del sistema visual (modo oscuro/claro y tipografías Oswald y Outfit). Ambas páginas llevan en lo alto el aviso destacado "Borrador pendiente de revisión legal" ("Draft pending legal review"). En `/privacidad` se explica con lenguaje claro los datos almacenados (alias, email, carreras con GPS y ritmos), la finalidad del juego y las ligas, que nunca se publican horarios ni puntos de inicio/fin, que provienen de Garmin, Polar o app solo si se conectan, almacenamiento privado del archivo original exclusivamente para verificar y detectar trampas, quién guarda tus datos (Supabase y Vercel) sin venta ni publicidad, el derecho a borrar la cuenta y los datos en cualquier momento, edad mínima de 16 años, y el correo de contacto `privacidad@PENDIENTE`. En `/terminos` se estipula que es un juego gratuito, que el usuario corre bajo su propia responsabilidad respetando las normas y el tráfico de Dubái, edad mínima de 16 años, la prohibición estricta de trampas (vehículos a motor/ruedas, compartir cuentas, falsear GPS) y la potestad de anular carreras sospechosas y sancionar cuentas. Se han integrado enlaces en el menú superior de la app (`TerritoryHeader` -> `AppMenuModal`) y en el pie de la pantalla (`MapLegend`).
- **Pendiente:** correo de contacto real en vez de `privacidad@PENDIENTE` y validación jurídica.
- **Siguiente paso:** ninguno.

## T-25 · Grabar carrera en la app (PWA)

- **Estado:** terminada (PR #12 fusionado en `main`).
- **Hecho:** nueva página `/grabar` en `apps/web` con botón grande "Empezar carrera", seguimiento GPS en alta precisión (`watchPosition`), Wake Lock para mantener encendida la pantalla con aviso sencillo ("Deja la pantalla encendida mientras corres"), visualización en tiempo real de tiempo transcurrido, distancia y ritmo actual en formato "5:12 /km", y botón "Terminar". Al finalizar, persistencia local en el teléfono con IndexedDB en formato GPX y vista de resumen (distancia, tiempo y ritmo medio) con descarga opcional de GPX y retorno al mapa. Lógica pura en `packages/core`: filtrado de puntos (descarte de precisión > 30 m y saltos imposibles > 12 m/s), cálculo de métricas de ritmo y distancia, y constructor de GPX 1.1 con tests unitarios que verifican que el GPX producido es interpretado correctamente por `parseGpx`. Diseño atlético en español sin tecnicismos (sin mención a H3 ni a s/km).
- **Pendiente:** prueba de campo con teléfono real corriendo en la pista de Jumeirah–Kite.
- **Siguiente paso:** ninguno.

## T-27 · Reglas de conquista de la revisión de producto

- **Estado:** terminada (PR #13 fusionado en `main`).
- **Hecho:** nueva migración `supabase/migrations/20261031170000_conquest_rules_review.sql` (no aplicada en ninguna base de datos) que aplica las 4 decisiones de la revisión de producto:
  1. El día cierra antes de las 04:00 (hora de Dubái) (en lugar de medianoche) para `snapshot_daily_points`, `apply_run`, `recompute_season` y el conteo de días mediante `private.zone_day_key`.
  2. Debilitamiento: si el dueño no vuelve a correr una baldosa en 7 días, su tiempo empeora 5 s/km por día hasta un máximo de 60 s/km. Superar ese tiempo debilitado es necesario para robarla (en empate defiende el dueño actual).
  3. Tope de 20 puntos diarios por baldosas poseídas (+1 por conquista y +2 por robo siguen aparte).
  4. Al ascender de liga (`reason = 'promotion'`), se liberan las baldosas que el corredor poseía en su liga anterior mediante trigger `user_league_promoted` en `user_leagues`.
  5. Lógica de dominio en `packages/core/src/ownership/` (`day.ts` y `decide.ts`) y tests unitarios exhaustivos (`rules.test.ts`) junto con validación en `scripts/verify-db.ts` que cubren todos los casos límite (día 7 contra día 8, tope de 60, exactamente 20 puntos, empate, el día cierra antes de las 04:00 (hora de Dubái) y liberación de baldosas). Seguridad preservada con `SECURITY DEFINER`, `search_path = ''` y permisos exclusivos para `service_role`.
- **Pendiente:** ninguno.
- **Siguiente paso:** ninguno.

## T-15 · Pantalla "Mis carreras" (sin servidor todavía)

- **Estado:** terminada (PR #14 fusionado en `main`).
- **Hecho:** nueva página `/carreras` en `apps/web` con la lista de carreras guardadas en el teléfono (IndexedDB de T-25), ordenadas cronológicamente (la más reciente primero), mostrando fecha, distancia, tiempo y ritmo medio en formato "5:12 /km". Al tocar una carrera: modal con visualización del recorrido en mini mapa (MapLibre GL y alternativa vectorial SVG), resumen de métricas, "Descargar archivo de la carrera" y "Borrar" con ventana de confirmación previa. Si no hay carreras, pantalla amable con botón principal "Grabar mi primera carrera" hacia `/grabar`. Opción avanzada discreta al final: "Subir archivo de mi reloj (.gpx o .fit)" con validación mediante parsers de `packages/core` y mensajes de error comprensibles en lenguaje claro si el archivo está dañado. Enlace a `/carreras` desde el resumen de `/grabar` y desde el botón flotante del mapa principal (sin alterar `MapLegend.tsx` ni `TerritoryHeader.tsx`). Textos en español sencillo sin términos técnicos como "H3", "s/km" ni "GPX" en pantalla (salvo en la opción avanzada).
- **Pendiente:** sincronización remota con backend en la Fase 1.
- **Siguiente paso:** ninguno.

## T-28 · Arreglos en la grabación GPS (/grabar)

- **Estado:** terminada (PR #15 fusionado en `main`).
- **Hecho:** en rama `t28-gps-pantalla`:
  1. Velocidad y ritmo calculados con media móvil de 15 a 20 s (no punto a punto), ignorando movimientos dentro del margen de error del GPS (accuracy) y mostrando "--" si en los últimos 10 s el avance es menor a 5 m (estás quieto). Mostrando solo ritmo y velocidad en pantalla sin texto "· media móvil".
  2. Descarte de puntos con velocidad implícita superior a 25 km/h respecto al punto anterior, sin sumarlos a la distancia.
  3. Banner en búsqueda de señal: "Buscando señal GPS… Sal al aire libre, lejos de edificios altos" y, tras 60 s sin señal precisa, botones "Empezar igual" o "Cancelar". Aviso visible "No bloquees el teléfono mientras grabas" durante la búsqueda y la grabación.
  4. Tests unitarios en `packages/core/src/recording`: puntos que saltan alrededor de un mismo sitio (distancia en 0 y ritmo en "--") y salto imposible (> 25 km/h descartado).
- **Pendiente:** ninguno.
- **Siguiente paso:** ninguno.

## T-29 · Detalle de carrera en móvil (iPhone Safari)

- **Estado:** terminada (PR #16 fusionado en `main`).
- **Hecho:** correcciones en el modal de detalle de carrera en "Mis carreras" (`/carreras`) optimizadas para iPhone con Safari (375 a 430 px):
  1. Botón de cierre (✕): integrado dentro del encabezado modal, visible con contraste nítido, objetivo táctil ampliado a 44x44 px (Apple HIG) y respeto del área segura superior mediante `padding env(safe-area-inset-top)` para evitar colisiones con la barra del navegador.
  2. Botón "Borrar carrera": ancho completo, ubicado debajo de "Descargar archivo de la carrera", con estilo de acción peligrosa (fondo sutil y borde/texto rojo `#ef4444`), y espaciado inferior seguro con `padding env(safe-area-inset-bottom)` para que la barra de Safari no lo tape.
  3. Mini mapa de la carrera: ajustado mediante `fitBounds` con padding adecuado; soporte robusto para carreras cortas (pocos metros o punto único) mostrando punto de inicio destacado; alternativa SVG vectorial solo en caso de fallo real de WebGL o de carga del estilo; contenedor `.run-mini-map-canvas` corregido al 100% con `ResizeObserver` para evitar recuadros negros vacíos durante transiciones de apertura.
  4. Botón "Descargar archivo de la carrera": tamaño de texto y espaciado optimizados para entrar en una sola línea en anchos de 375 a 430 px, o verse bien en dos líneas centradas sin desbordes.
- **Pendiente:** ninguno.
- **Siguiente paso:** ninguno.

## T-30 · La app en español e inglés

- **Estado:** terminada (PR #17 fusionado en `main`, squash `079afac`).
- **Hecho:** sistema de traducción (i18n) propio, sin dependencias de pago y compatible con `output: "export"`. Textos visibles de `apps/web` extraídos a diccionarios `es` y `en`. Detección automática del idioma del dispositivo (`navigator.language`) con fallback a inglés, y almacenamiento en `localStorage` (`dubai_run_locale`). Selector ES/EN. Traducción de `/privacidad` y `/terminos`. Formateo localizado. Mensaje «Sin recorrido GPS» / «No GPS track» con menos de 2 puntos GPS. Tests de paridad de claves `es`/`en`. Umbral del test GPX: 300 ms en local, 500 ms solo si `process.env.CI` está definido (documentado; 750 ms en Windows si aplica).
- **Pendiente:** nada.
- **Siguiente paso:** ninguno de código de T-30.

## T-31 · Traspaso del manager a Antigravity

- **Estado:** terminada (PR #20 fusionado en `main`, squash `fa1de3c`).
- **Hecho:** creación de `docs/MANAGER.md` con el playbook operativo para el manager en Antigravity (rol, límites, producto, seguridad, stack, flujo de trabajo, prompts, criterios de revisión detallados y backlog). Enlace al manager en `AGENTS.md`. Actualización de `docs/ESTADO.md` (cierre de T-30, sección T-31 y tabla de conversaciones). Actualización de `README.md` marcando soporte bilingüe como disponible/en producción.
- **Pendiente:** ninguno.
- **Siguiente paso:** ninguno.

## T-14 · Autenticación y perfil

- **Estado:** terminada (push directo a main en commit `4298309` sin PR; el número `#21` en el commit no es un PR real).
- **Hecho:**
  1. Integración de Supabase Auth en `apps/web` con cliente y wrapper desacoplado en `src/lib/supabase/` leyendo `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` de forma segura.
  2. Flujo de login con Google mediante `signInWithOAuth` con redirección adecuada hacia `/auth/callback` y soporte PKCE (`detectSessionInUrl: true`) compatible con exportación estática (`output: "export"`).
  3. Flujo de login por Email OTP preparado pero condicionado a la variable de entorno `NEXT_PUBLIC_EMAIL_LOGIN === 'true'`. Si el flag está inactivo o ausente, solo se ofrece Google.
  4. Onboarding de Alias: modal bloqueante cuando el usuario autenticado tiene `alias == null` en `public.profiles`. Validación en cliente de 3 a 20 caracteres sin espacios ni caracteres de control, con manejo de error por unicidad (`profiles_alias_lower_uidx`).
  5. Punto de acceso en la UI: estado de usuario (alias y avatar con iniciales o botón "Iniciar sesión") en la cabecera `TerritoryHeader` y en `AppMenuModal`, con opción visible de "Cerrar sesión" para usuarios autenticados.
  6. Soporte bilingüe en `es` y `en` con paridad total de claves en `apps/web/src/i18n/dictionaries.ts`.
  7. Documentación `docs/AUTH.md` con variables de entorno, configuración gratuita de Google Cloud OAuth en Supabase y conexión de SMTP (Resend / Brevo) para dominio propio.
- **Pendiente:** ninguno.
- **Siguiente paso:** ninguno.

## T-32 · Reglas técnicas permanentes

- **Estado:** terminada (push directo a main en commit `76b2bdf` sin PR; el número `#22` en el commit no es un PR real).
- **Hecho:** definición de las 7 reglas técnicas permanentes en `AGENTS.md` (sitio estático puro, austeridad de dependencias, resiliencia offline/degradado, i18n estricta, seguridad y secretos, agnosticismo de base de datos y experiencia móvil). Creación de `docs/GUIA-AUGUSTO.md` para estandarizar la interacción entre Augusto y el Manager. Integración del paso de verificación obligatoria contra reglas permanentes y adición continua de reglas en `docs/MANAGER.md` (§6, §7 y §11), además de estipular `git pull` en `main` al iniciar, gestión de prompts con prefijo `EXISTENTE:`, fusión autónoma por parte del manager y enlace a la guía rápida.
- **Pendiente:** ninguno.
- **Siguiente paso:** ninguno.

## T-17 · Puntos diarios y ranking de temporada

- **Estado:** terminada (PR #21 fusionado en main, squash `f8fc6bf`).
- **Hecho:**
  1. Módulo de dominio `packages/core/src/ranking/` para calcular y ordenar el ranking de liga según los 4 criterios oficiales: Criterio 1: Total de puntos acumulados en la temporada (`daily_points.points`), Desempate 1: Número de celdas poseídas al cierre/actuales (`cell_ownership`), Desempate 2: Kilómetros acumulados en carreras válidas dentro de la zona durante la temporada, Desempate 3: Antigüedad (quien alcanzó primero la puntuación). Tests unitarios exhaustivos en Vitest (`ranking.test.ts`).
  2. Página `/ranking` en `apps/web`: bilingüe (español e inglés), selector superior por liga (Starter, Intermediate, Advanced, Elite), podio de los 3 primeros puestos con estilo atlético y tarjetas para el resto de posiciones, indicador de días restantes de la temporada y posición del corredor actual (si está logueado).
  3. Enlace a `/ranking` en el menú principal (`AppMenuModal`).
  4. Resiliencia / degradación elegante: en entorno sin Supabase (`!isSupabaseConfigured()`) se muestran datos de muestra con etiqueta visible "Datos de ejemplo" / "Sample data". Con Supabase configurado, la interfaz maneja estados de borde reales: sin filas muestra "Sin clasificados aún" sin inventar datos, y ante errores de red ofrece reintento con mensaje traducido.
  5. Simetría total de claves i18n en `apps/web/src/i18n/dictionaries.ts`.
  6. Directrices de gobernanza agregadas en `docs/MANAGER.md` (§7 y §8).
- **Pendiente:** El desempate por km acumulados en zona está implementado y probado en `packages/core`, pero la tabla `runs` no tiene columna `league_id` y su RLS limita la lectura a carreras propias; se necesita una vista o RPC de servidor en una tarea futura para alimentar los km acumulados de todos los corredores sin exponer datos privados.
- **Siguiente paso:** ninguno de código de T-17.

## T-33 · Checklist de calidad del Manager

- **Estado:** hecho (PR #22 fusionado en `main`, squash `78f903d`).
- **Hecho:**
  1. Formalización en `docs/MANAGER.md` (§7) de la "Checklist obligatoria de calidad del Manager antes de aprobar cualquier PR", publicada obligatoriamente como comentario en el PR con `gh pr comment`.
  2. Definición exhaustiva de los 10 puntos de control: verificación con GitHub CLI (`gh pr view` y `gh pr checks`), CI `verify` completo en verde, comprobación de arreglos en el diff, prohibición estricta de datos ficticios/mocks en producción (empty state o error state con reintento), coherencia con esquema y RLS de BD, eficiencia de consultas (`.in("id", ...)` o paginación), cero hardcoding de usuario o datos de temporada, cumplimiento de las 7 reglas técnicas permanentes de `AGENTS.md`, textos comprensibles para corredores y veracidad documental en `ESTADO.md`.
  3. Regla en `docs/MANAGER.md` (§6) de revisar con `gh` el último commit del PR antes de emitir un prompt de arreglos.
  4. Protocolo para tareas grandes (base de datos, login, pagos) con apertura de conversación 'Revisor' antes de fusionar.
  5. Reafirmación de fusión exclusiva con `gh pr merge <N> --squash --delete-branch` y autonomía del Manager para elegir la siguiente tarea en §8.
  6. Internacionalización de `aria-label="Navegación principal y legal"` en `AppMenuModal.tsx` mediante clave `menuNavAria` en los diccionarios `es` y `en`.
  7. Actualización de `docs/GUIA-AUGUSTO.md`: regla "main está protegida: todo entra por PR con verify en verde", instrucción para el Revisor y sección final "¿Pego o no el prompt del Manager?".
  8. Corrección documental de T-14 y T-32 en `docs/ESTADO.md`.
- **Pendiente:** ninguno.
- **Siguiente paso:** ninguno.

## T-34 · Conexión del mapa de territorios a Supabase

- **Estado:** en curso (rama `t34-mapa-supabase`).
- **Hecho:**
  1. Repositorio híbrido `HybridTerritoryRepository` en `apps/web/src/lib/territory/territory-repository.ts` siguiendo el patrón de `HybridRankingRepository` sin hooks de React (`currentUserId: string | null` recibido desde la UI).
  2. Con Supabase sin configurar (`!isSupabaseConfigured()`), devuelve datos de muestra (`mock-data.ts`) con `isSampleData: true` para mostrar el badge visible "Datos de ejemplo" / "Sample data".
  3. Con Supabase configurado (`isSupabaseConfigured()`), consulta `zones` por `slug = 'jumeirah-kite'` sin exigir `status = 'active'` (compatible con `draft`), lee `zone_cells`, consulta temporada activa (`status = 'active'`), y si no existe temporada activa muestra todas las baldosas en `"free"` sin inventar dueños ni usar mocks.
  4. Consulta `cell_ownership` por zona, temporada y liga seleccionada, perfiles exclusivamente con `.in("id", ownerIds)` y `cell_efforts` propios (`.eq("user_id", currentUserId)`) sin tocar `runs`, calculando `"threatened"` solo cuando han pasado > 7 días de juego en Dubái desde `MAX(crossed_at)` propio y conservando la mejor marca propia (`MIN(pace_s)`).
  5. Propaga errores de red/consulta sin fallback silencioso a datos simulados y muestra aviso con botón de reintentar en `TerritoryStage.tsx`.
  6. Integración en `TerritoryStage.tsx` con `useAuth()` (`user?.id ?? null`), liga real desde Supabase (por defecto `"starter"`), estado reactivo de carga/sesión/liga, badge visible de datos de ejemplo cuando corresponde, `CellBottomSheet` con alias real, ritmo y diferencia frente a mejor marca propia, y diccionarios `es`/`en` simétricos.
  7. Reglas permanentes reutilizables añadidas en `AGENTS.md` y tests unitarios del repositorio en `territory-repository.test.ts`.
- **Pendiente:** validación de CI (`verify`) y revisión del PR por el Manager.
- **Siguiente paso:** abrir PR en GitHub para T-34 y esperar revisión del Manager.

## En curso

T-34 · Conexión del mapa de territorios a Supabase en curso (rama `t34-mapa-supabase`). Siguiente: bloqueos externos (Gmail del proyecto → Garmin T-22 / Polar) + desplegar `process-run`.

### Tabla de conversaciones Antigravity

| Tarea | Conversación Antigravity | Rama                                           | PR                      | Estado    |
| ----- | ------------------------ | ---------------------------------------------- | ----------------------- | --------- |
| T-15  | T-15 Mis carreras        | t15-mis-carreras                               | #14                     | fusionado |
| T-28  | T-28 GPS                 | t28-gps-pantalla                               | #15                     | fusionado |
| T-29  | T-29 Detalle móvil       | t29-detalle-carrera-movil                      | #16                     | fusionado |
| T-30  | T-30 Inglés              | t30-ingles                                     | #17                     | fusionado |
| docs  | (README / capturas)      | docs-public-readme / docs-progress-screenshots | #18 / #19               | fusionado |
| T-31  | T-31 Traspaso manager    | t31-traspaso-manager                           | #20                     | fusionado |
| T-14  | T-14 Auth                | t14-auth                                       | - (push directo a main) | fusionado |
| T-32  | T-32 Reglas              | t32-reglas-tecnicas                            | - (push directo a main) | fusionado |
| T-17  | T-17 Ranking             | t17-ranking                                    | #21                     | fusionado |
| T-33  | T-33 Checklist Manager   | t33-checklist-manager                          | #22                     | fusionado |
| T-34  | T-34 Mapa Supabase       | t34-mapa-supabase                              | (abierto)               | en curso  |
