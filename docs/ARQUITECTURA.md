# Runners Dubái: arquitectura (Fase 0)

> Versión 0.1, 27 oct 2026 (hora del Golfo, UTC+4). Límites y precios verificados en las webs oficiales en esta fecha; pueden cambiar.
> **ESTIMACIÓN** marca cálculos propios. **PROPUESTA** marca decisiones pendientes de aprobación.

## 1. Principios

1. **Costo cero hasta validar.** Solo planes gratuitos que permitan uso comercial.
2. **Un núcleo de lógica compartido.** Un paquete TypeScript puro (`packages/core`) concentra el parseo, el antitrampas, las celdas y la puntuación. Lo usan la web, la Edge Function y, en el futuro, la app Expo.
3. **El servidor manda.** El navegador solo muestra una vista previa; el resultado oficial lo calcula el backend.
4. **El mapa es derivado.** La propiedad de las celdas se puede **recalcular** siempre a partir de las marcas de carreras aceptadas, lo que permite anular trampas sin perder consistencia.
5. **Zonas por configuración.** Añadir una zona es insertar datos, no escribir código.

## 2. Stack a costo cero (verificado)

### Decisión vigente de hosting (27 oct 2026)

La Fase 0 se aloja en **Vercel, plan Hobby**. El dueño ya tiene la cuenta conectada. Ese plan vale mientras el producto sea una validación **sin ingresos**: Vercel limita Hobby a uso personal y no comercial ([Vercel Hobby](https://vercel.com/docs/plans/hobby)).

La web es un **export estático** de Next.js (`output: 'export'`): HTML, CSS y JS. No usa middleware, Server Actions, Image Optimization, ISR, ni ninguna API que solo exista en Vercel. El directorio `apps/web/out` es el artefacto. Cuando el proyecto empiece a cobrar, se publica ese mismo directorio en **Cloudflare Pages (plan Free)**, que sí permite uso comercial (límites: 500 builds al mes, 1 build simultáneo, 20.000 archivos, 25 MiB por archivo; las peticiones estáticas no se cobran). La migración no reescribe el mapa, las zonas ni `packages/core`. Los pasos están en `docs/DEPLOY.md`.

El proyecto de Supabase ya existe: **dubai-run-territory**, ref `usduksotdecgusaxeyva`, región `ap-south-1`. La URL pública es `https://usduksotdecgusaxeyva.supabase.co`. La anon key no se commitea; va en `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

| Pieza         | Elección                                                                                                               | Límite gratuito relevante                                                                                                                                                             | Fuente                                                                                                                            |
| ------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Frontend      | PWA con Next.js, React y TypeScript. Export estático, manifest e iconos propios (sin plugin atado a un host)           | — (código abierto)                                                                                                                                                                    | npm                                                                                                                               |
| Hosting web   | **Vercel Hobby** durante la validación sin ingresos. Destino al cobrar: **Cloudflare Pages Free**, con el mismo `out/` | Hobby: uso no comercial. Pages: 500 builds/mes, estáticos ilimitados                                                                                                                  | [Vercel Hobby](https://vercel.com/docs/plans/hobby), [Límites de Pages](https://developers.cloudflare.com/pages/platform/limits/) |
| Base de datos | **Supabase Free**: Postgres con **PostGIS**                                                                            | 500 MB de BD, 5 GB de egress, 1 GB de Storage (subida máxima de 50 MB), 50.000 usuarios activos al mes; **sin backups**; **se pausa tras 1 semana sin actividad**; máximo 2 proyectos | [Precios de Supabase](https://supabase.com/pricing), [PostGIS](https://supabase.com/docs/guides/database/extensions/postgis)      |
| Procesamiento | **Supabase Edge Functions** (Deno)                                                                                     | 500.000 invocaciones al mes; 256 MB de memoria; **2 s de CPU por petición**; 150 s de reloj (plan Free)                                                                               | [Límites de Functions](https://supabase.com/docs/guides/functions/limits)                                                         |
| Archivos      | Supabase Storage, bucket privado                                                                                       | Incluido en 1 GB                                                                                                                                                                      | [Precios de Supabase](https://supabase.com/pricing)                                                                               |
| Auth          | Supabase Auth con **Google** (sin costo) y email OTP cuando haya SMTP propio                                           | Ver §2.1                                                                                                                                                                              | [Google](https://supabase.com/docs/guides/auth/social-login/auth-google), [SMTP](https://supabase.com/docs/guides/auth/auth-smtp) |
| Mapa          | **MapLibre GL JS** con teselas de **OpenFreeMap**                                                                      | Instancia pública gratis, sin límite de vistas, sin API key, **uso comercial permitido**; atribución obligatoria (MapLibre la añade sola)                                             | [openfreemap.org](https://openfreemap.org/)                                                                                       |
| Celdas        | **h3-js** (v4.5.0 en npm)                                                                                              | —                                                                                                                                                                                     | [h3geo.org](https://h3geo.org/docs/core-library/restable/)                                                                        |
| FIT           | **@garmin/fitsdk** (SDK oficial de Garmin, v21.218.0 en npm)                                                           | —                                                                                                                                                                                     | [fit-javascript-sdk](https://github.com/garmin/fit-javascript-sdk)                                                                |
| GPX           | `fast-xml-parser` (funciona en el navegador y en Deno)                                                                 | —                                                                                                                                                                                     | npm                                                                                                                               |
| Tests y CI    | Vitest y GitHub Actions                                                                                                | Cuota gratuita de GitHub                                                                                                                                                              | —                                                                                                                                 |

**Por qué Next.js y no Vite:** la cuenta de Vercel ya está conectada y las variables públicas usan el prefijo `NEXT_PUBLIC_`. El export estático deja la puerta abierta a Cloudflare Pages; `packages/core` sigue sin DOM, para la Edge Function y para Expo.

**Worker de MapLibre:** la librería arma la URL de su Web Worker con un `new URL` dinámico. Turbopack la reescribe al bundle de desarrollo, el worker no arranca y el mapa se queda en blanco (Chrome y Safari del iPhone fallan igual: el script vuelve como HTML). `apps/web/next.config.ts` copia `maplibre-gl-worker.mjs` a `public/map/` en cada `next dev` y `next build`, y el cliente llama a `setWorkerUrl` con esa ruta absoluta antes de crear el mapa. El service worker no intercepta ese archivo: en Safari un module worker respondido por el service worker no carga. Sigue siendo un estático, la misma URL en Vercel y en Cloudflare Pages, sin API exclusiva de Vercel. El estilo oscuro es el de OpenFreeMap recoloreado en `public/map/style.json` (fondo `#07090e`); sprites y glifos siguen en OpenFreeMap, sin clave.

**Por qué no Cloudflare Workers para procesar archivos:** su plan gratuito da muy poca CPU por petición. La Edge Function de Supabase (2 s de CPU) está junto a la base de datos.

### 2.1 Auth: la trampa del email gratis

- El SMTP por defecto de Supabase **solo envía a miembros del equipo del proyecto y con un límite muy bajo** (2 emails por hora). No sirve para usuarios reales ([docs](https://supabase.com/docs/guides/auth/auth-smtp)).
- Los SMTP gratuitos exigen un **dominio propio verificado**:
  - Resend Free: 3.000 emails al mes y 100 al día ([precios](https://resend.com/pricing)).
  - Brevo Free: 300 al día ([ayuda de Brevo](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan)).
- Un dominio cuesta dinero; el subdominio gratuito `*.pages.dev` no sirve para enviar correo.
- Sign in with Apple requiere la membresía de Apple Developer de pago.
- **PROPUESTA:**
  - Fase 0 con **Login con Google**, que cuesta cero.
  - El código de email OTP queda listo y se activa cuando haya dominio, enchufando el SMTP de Resend o Brevo.
  - En desarrollo se prueba con el SMTP por defecto (solo para el equipo).

### 2.2 Riesgos del plan gratuito

- **Pausa por inactividad:** un proyecto Free se pausa tras 1 semana sin actividad. Mitigación: tarea programada `pg_cron` diaria (actividad real del juego, la foto de puntos) y un ping semanal desde GitHub Actions.
- **Sin backups:** exportación semanal `pg_dump` desde GitHub Actions a un artefacto privado (tarea del backlog).

## 3. Estructura del repositorio

```
runners-app/
  apps/web/              PWA (Next.js estático + React + MapLibre)
  packages/core/         Lógica pura TS: parse GPX/FIT, normalizar, antitrampas, celdas, puntuación, ligas
  supabase/
    migrations/          SQL: esquema, RLS, funciones (apply_run, recompute_season, daily_points)
    functions/process-run/  Edge Function (Deno) que importa packages/core
    seed/                zonas (GeoJSON), ligas, temporada 1
  fixtures/              GPX/FIT de prueba (válidos, bici, teletransporte, duplicado…)
  docs/                  PRODUCTO.md, ARQUITECTURA.md, TAREAS.md
```

## 4. Modelo de datos (Postgres + PostGIS)

Las geometrías van en `geography(…, 4326)` y los índices H3 como `text` (formato hex de h3-js).

| Tabla              | Campos clave                                                                                                                                                                                                                                                                                                                       | Notas                                                        |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `zones`            | `id`, `slug`, `name`, `polygon geography(Polygon)`, `h3_res int`, `status` (`draft`/`active`/`archived`), `timezone`                                                                                                                                                                                                               | La zona MVP es `jumeirah-kite`, con `h3_res` = 10            |
| `zone_cells`       | `zone_id`, `h3`, `center geography(Point)`, `boundary geography(Polygon)`                                                                                                                                                                                                                                                          | PK (`zone_id`, `h3`); precalculadas al crear la zona         |
| `leagues`          | `id`, `zone_id` (nulo = global), `code`, `name`, `min_pace_s`, `max_pace_s`, `sort`                                                                                                                                                                                                                                                | Bandas configurables (ver PRODUCTO §3.7)                     |
| `seasons`          | `id`, `zone_id`, `name`, `starts_at`, `ends_at`, `status` (`scheduled`/`active`/`closed`)                                                                                                                                                                                                                                          | Fechas en UTC; se muestran en hora del Golfo                 |
| `profiles`         | `id` (= `auth.users.id`), `alias` único, `created_at`, `is_admin`                                                                                                                                                                                                                                                                  | Sin datos sensibles; sexo y edad, opcionales y futuros       |
| `user_leagues`     | `user_id`, `season_id`, `league_id`, `ref_pace_s`, `reason` (`provisional`/`season_start`/`promotion`), `valid_from`                                                                                                                                                                                                               | Historial de asignaciones                                    |
| `runs`             | `id`, `user_id`, `zone_id`, `season_id`, `storage_path`, `file_sha256`, `track_hash`, `format` (`gpx`/`fit`), `sport`, `started_at`, `ended_at`, `distance_in_zone_m`, `status` (`pending`/`processing`/`accepted`/`review`/`rejected`/`voided`), `reject_code`, `flags jsonb`, `league_id`, `track_in_zone geography(LineString)` | `track_in_zone` es privada (solo el dueño y el admin)        |
| `cell_efforts`     | `id`, `run_id`, `user_id`, `zone_id`, `season_id`, `league_id`, `h3`, `crossed_at`, `pace_s` (int, s/km), `window_start_m`, `window_end_m`                                                                                                                                                                                         | Una fila por celda y carrera (la mejor)                      |
| `cell_ownership`   | `zone_id`, `season_id`, `league_id`, `h3`, `owner_id`, `effort_id`, `pace_s`, `achieved_at`, `since`                                                                                                                                                                                                                               | PK (`zone_id`, `season_id`, `league_id`, `h3`); **derivada** |
| `ownership_events` | `id`, `type` (`conquest`/`steal`/`defend`/`improve`), `h3`, `league_id`, `season_id`, `actor_id`, `prev_owner_id`, `run_id`, `created_at`                                                                                                                                                                                          | Para el feed, los avisos y los puntos                        |
| `daily_points`     | `season_id`, `league_id`, `user_id`, `day`, `cells_owned`, `points`                                                                                                                                                                                                                                                                | Foto de las 23:59, hora del Golfo                            |
| `reports`          | `id`, `run_id`, `reporter_id`, `reason`, `status`                                                                                                                                                                                                                                                                                  | Reportes de trampas                                          |

**RLS (Row Level Security):**

- `cell_ownership`, `zone_cells`, `seasons`, `leagues`, el alias en `profiles` y `daily_points` son **públicos en lectura**.
- `runs` y `cell_efforts` solo los lee su dueño; el admin lo lee todo.
- Nadie escribe directamente en `cell_ownership`; solo las funciones `security definer` llamadas por la Edge Function con la service key.

**Concurrencia:** `apply_run(run_id, efforts jsonb)` se ejecuta en una transacción y bloquea con `SELECT … FOR UPDATE` las filas de `cell_ownership` afectadas. Así, dos subidas simultáneas no pisan el mismo robo.

**Tamaño (ESTIMACIÓN):** con 100 corredores, unas 3 carreras por semana y unos 100 `cell_efforts` por carrera, se generan unas 30.000 filas por semana, del orden de unos pocos MB por temporada. Cabe con holgura en 500 MB.

## 5. Flujo de procesamiento de una carrera

```
[Navegador]
 1. Elegir archivo .gpx/.fit (máx. 10 MB, PROPUESTA)
 2. packages/core lo parsea localmente → vista previa (recorrido dentro de la zona + celdas tocadas). No escribe nada.
 3. Calcular SHA-256; subir a Storage: runs-raw/{user_id}/{uuid}.{ext}  (bucket privado)
 4. INSERT runs (status = pending) e invocar la Edge Function process-run(run_id)
[Edge Function process-run]
 5. Descargar el archivo; parsear (GPX: trkpt lat/lon/time; FIT: record.timestamp + position en semicírculos → grados; session.sport)
 6. Normalizar: ordenar por tiempo, quitar duplicados y puntos sin hora, convertir a [t, lat, lon, cad?, hr?]
 7. Recortar a la zona: quedarse con los puntos dentro del polígono de la zona (+ un margen de 30 m); partir en tramos continuos
 8. Antitrampas (§6) → rechazar / marcar para revisión / aceptar
 9. Celdas: h3.latLngToCell(lat, lon, res) por punto; en cada cambio de celda, interpolar el instante del cruce
10. Marca por celda: ventana de 1 km centrada en el paso por la celda (distancia acumulada con haversine) → pace_s
11. Liga: calcular la mejor ventana de 1 km de la carrera; si es más rápida que la banda actual → ascenso (user_leagues)
12. RPC apply_run(run_id, efforts) → cell_efforts + cell_ownership + ownership_events en una transacción
13. runs.status = accepted (o review/rejected con reject_code); devolver un resumen a la web
[pg_cron]
14. Cada día a las 23:59 (hora del Golfo, 19:59 UTC): daily_points; al cerrar la temporada: congelar el ranking y abrir la siguiente
```

**Presupuesto de CPU (ESTIMACIÓN):** una carrera de 1 h a 1 punto por segundo son unos 3.600 puntos. El parseo y unas 3.600 llamadas a `latLngToCell` deberían quedar muy por debajo de los 2 s de CPU. Hay que **medirlo** (tarea T-13) con un FIT real de 3 h. Si no cabe, se limita a unos 20.000 puntos o se submuestrea a 1 punto por segundo.

## 6. Antitrampas (Fase 0)

Umbrales en **PROPUESTA**, para calibrar con datos reales.

| Regla                     | Umbral                                                                                                                     | Acción                                                                        |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Formato                   | GPX con `<time>` en cada punto; FIT con `record` con timestamp y posición                                                  | Si no, rechazar (`NO_TIMESTAMPS`)                                             |
| Deporte                   | FIT `session.sport` = running (o generic + resto OK); GPX `<type>`, si existe, debe ser de running                         | cycling/e-bike → rechazar (`NOT_RUNNING`)                                     |
| Fechas                    | Sin horas futuras; inicio dentro de la temporada activa; subida en ≤ 72 h                                                  | Rechazar (`OUT_OF_WINDOW`)                                                    |
| Densidad                  | ≥ 1 punto cada 10 s de media dentro de la zona                                                                             | Rechazar (`LOW_DENSITY`)                                                      |
| Picos de velocidad        | Tramo entre puntos > 12 m/s (43 km/h)                                                                                      | Descartar el punto; si son más del 5 % de los puntos, rechazar (`GPS_SPIKES`) |
| Teletransporte / huecos   | Hueco > 30 s **o** salto > 100 m                                                                                           | Partir el tramo; las ventanas no cruzan huecos                                |
| Ritmo imposible           | Ventana de 1 km más rápida que 2:40/km (6,25 m/s)                                                                          | Estado `review` (no puntúa hasta que el admin lo apruebe)                     |
| Patrón de bici o patinete | Mediana > 5,5 m/s con muy poca variación de velocidad, o cadencia mediana < 120 pasos/min a más de 4 m/s (si hay cadencia) | `review`                                                                      |
| Cadencia (si existe)      | Normalizada a pasos/min; un rango típico de carrera es 140–220                                                             | Fuera de rango y rápido → `review`                                            |
| Mínimo útil               | ≥ 1 km continuo dentro de la zona                                                                                          | Si no, aceptar sin celdas (`TOO_SHORT`)                                       |
| Duplicado propio          | El mismo `file_sha256` o una carrera que se solapa en el tiempo con otra del mismo usuario                                 | Rechazar (`DUPLICATE`)                                                        |
| Copia de otro usuario     | `track_hash` (puntos redondeados a unos 10 m y 5 s) igual a otra carrera                                                   | Rechazar ambas para revisión (`COPIED_TRACK`)                                 |
| Límite diario             | Máximo 3 carreras al día por usuario                                                                                       | Rechazar (`RATE_LIMIT`)                                                       |
| Comunidad                 | Botón "reportar" en el detalle de celda                                                                                    | Cola de revisión del admin                                                    |
| Anulación                 | El admin anula una carrera                                                                                                 | `recompute_season(season_id)`                                                 |

**Contexto local:** paralela a la pista de running hay una **pista ciclista de unos 16 km**, y la RTA instaló 67 señales para separar usos ([Gulf News](https://gulfnews.com/living-in-uae/jogging-on-jumeirah-beach-in-dubai-watch-out-for-these-new-safety-signs-1.1726747490398)). Las bicis pasan a metros de la pista, así que la detección de bicicleta es prioritaria.

**Limitación honesta:**

- Un GPX es texto y se puede fabricar con herramientas gratuitas. En la Fase 0 el riesgo se acepta con revisión manual, reportes y temporadas cortas.
- La API de Strava no sirve para el mapa público, porque prohíbe mostrar los datos de un usuario a otros (lo recoge el informe de nichos).
- La Fase 1 añade grabación en la app con más señales.

## 7. Definición de la zona MVP: Jumeirah Beach a Kite Beach

### 7.1 La pista (fuentes)

- Pista de superficie blanda de **unos 7 km por sentido (14 km ida y vuelta)**, desde la zona del Burj Al Arab/Umm Suqeim, pasando por Kite Beach, hasta Jumeirah 1. Tiene **marcas cada 100 m** e iluminación ([The National](https://www.thenationalnews.com/lifestyle/in-pictures-dubai-s-jumeirah-and-kite-beach-running-track-reopens-to-the-public-1.1020319), [Sport360](https://sport360.com/article/health-and-fitness/329674/where-to-run-in-dubai-best-running-tracks-in-dubai-2)).
- El tramo más usado, de Umm Suqeim Park a Kite Beach, mide **unos 3,7 km** ([UAE Inform](https://uaeinform.com/dubai/jumeirah-beach-running-track)).

### 7.2 Polígono

- El archivo es `supabase/seed/zones/jumeirah-kite.geojson` (y la misma copia en `.json` para que el bundler la importe). Lo regenera `pnpm zone:cells`.
- El eje es la way de OpenStreetMap **332925290**, «Jumeirah Corniche Running Track» (`leisure=track`, `sport=running`, `surface=tartan`): 241 puntos, **6.850 m**. Extremo sur junto al Burj Al Arab / Umm Suqeim, pasa por Kite Beach y termina al norte donde OSM corta la way, en Jumeirah 3. **No llega todavía a Jumeirah 1.**
- El polígono es un corredor de **25 m a cada lado** de ese eje, con tapas redondas. Donde la pista ciclista se separa más de 25 m, queda fuera. **Coordenadas aproximadas** (OSM, no un levantamiento). Augusto tiene que aprobarlas con una carrera real.
- Extremos del eje mapeado, aproximados: sur `(25.1474, 55.1943)`, norte `(25.1931, 55.2310)`.

### 7.3 Resolución H3 propuesta: **10**

| Resolución | Lado medio    | Área media         | Celdas en la pista, ida (ESTIMACIÓN) | Celdas en el tramo de 3,7 km (ESTIMACIÓN) |
| ---------- | ------------- | ------------------ | ------------------------------------ | ----------------------------------------- |
| 9          | unos 201 m    | unos 105.000 m²    | 29–33                                | unos 16                                   |
| **10**     | **unos 76 m** | **unos 15.000 m²** | **69–96**                            | **unos 38**                               |
| 11         | unos 29 m     | unos 2.150 m²      | 199–387                              | unos 107                                  |

- Las áreas y lados son medias globales de [h3geo.org](https://h3geo.org/docs/core-library/restable/). h3-js 4.5 da, para la resolución 10, un lado medio de unos **66 m** y un área de unos **15.047 m²**. El «unos 76 m» de PRODUCTO está en el mismo orden (punta a punta el hexágono mide unos 130 m).
- **Conteo medido el 27 oct 2026** sobre el polígono aproximado de §7.2, con `polygonToCellsExperimental` y `containmentOverlapping`: **99 celdas**. Entra en el rango previsto de 70–120. Si Augusto mueve el polígono, `pnpm zone:cells` vuelve a imprimir el número y hay que actualizar esta línea.
- **Por qué 10:**
  - Una celda mide unos 150 m de punta a punta y se cruza en unos 30–45 s a 5 min/km.
  - El error típico del GPS de un reloj (varios metros) es pequeño frente a ese tamaño.
  - Unas 70–120 celdas por liga dan un mapa con sentido sin hacer que un robo sea trivial.
  - Con resolución 11, el GPS alternaría entre celdas vecinas y la pista ciclista caería en otras celdas con más facilidad.
- **Nota:** el informe de nichos de la Page decía "resolución 11, 120–140 celdas". Esta estimación más cuidadosa da más celdas en resolución 11, y por eso se propone la 10 (decisión de Augusto).
- **Celdas de la zona:**
  - Se calculan con `h3.polygonToCellsExperimental(polygon, 10, POLYGON_TO_CELLS_FLAGS.containmentOverlapping)` (h3-js 4.5, comprobado). Incluye toda celda que toque el polígono.
  - Se guardan en `zone_cells`.
  - Un punto GPS cuya celda no esté en `zone_cells` se ignora.

## 8. Cómo se añaden zonas nuevas

1. Dibujar el polígono (GeoJSON) y elegir la resolución: Marina y Downtown, 10; Al Qudra, probablemente 9, porque es un circuito largo de ciclismo y running en el desierto (PROPUESTA).
2. Ejecutar el script `scripts/create-zone.ts`. Hoy regenera el GeoJSON y la lista de celdas de `jumeirah-kite` (idempotente, sin base de datos). El `INSERT` en `zones` y `zone_cells` llega con T-02 / T-04, cuando haya migraciones; la zona nueva entra en `draft`.
3. Crear la temporada 1 de la zona y opcionalmente ligas propias (si no, se usan las globales).
4. Pasar la zona a `active`. La web la muestra en el selector de zonas (`/z/{slug}`).
5. Una carrera puede tocar **varias zonas**: el proceso recorta por cada zona activa y aplica las marcas a cada una por separado.

No hace falta tocar el motor: zona, resolución, ligas y temporadas son datos.

## 9. Camino a Expo (Fase 1 y después)

- **Fase 1, Expo Go (0 USD):**
  - app React Native que **reutiliza `packages/core`** y el mismo backend;
  - graba con `expo-location` en **primer plano** con la pantalla encendida;
  - Expo Go no permite GPS en segundo plano en iOS ni HealthKit (ya documentado en la Page).
- **Riesgo (verificado):**
  - Expo Go en el App Store solo soporta **el último SDK**. La versión actual de Expo Go en el App Store, 58.0.5, añade el SDK 58 ([App Store](https://apps.apple.com/us/app/expo-go/id982107779), [SDK 58](https://expo.dev/changelog/sdk-58)).
  - En 2026 hubo un periodo en que el Expo Go del App Store se quedó en un SDK antiguo, y los SDK nuevos requerían `eas go` + TestFlight, es decir, la cuenta de Apple de pago ([changelog de Expo](https://expo.dev/changelog/expo-go-and-app-store-may-2026), [troubleshooting](https://docs.expo.dev/troubleshooting/expo-go-version-mismatch/)).
  - Mitigación: fijar el proyecto al SDK que soporte el Expo Go publicado en el momento de empezar la Fase 1 y no actualizar sin comprobarlo.
  - Expo describe Expo Go como herramienta de aprendizaje y pruebas, no para producción.
- **Fase 2 (de pago, solo tras validar):**
  - Apple Developer Program, 99 USD al año;
  - development build con EAS, que permite GPS en segundo plano y HealthKit para importar entrenamientos del Apple Watch;
  - TestFlight y App Store.
- **Qué se prepara ya en la Fase 0:**
  - `packages/core` sin dependencias del DOM;
  - una API (RPC de Supabase) independiente del cliente;
  - un formato interno de puntos `[t, lat, lon, cad?, hr?]` común para un archivo subido y para la grabación en vivo.
