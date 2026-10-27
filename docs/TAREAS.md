# Runners Dubái: backlog de la Fase 0

> Versión 0.1, 27 oct 2026 (hora del Golfo, UTC+4).
> Cada tarea es pequeña e independiente, pensada para **asignarla a un agente de código de una en una**.
> Referencias: PRODUCTO.md (reglas) y ARQUITECTURA.md (stack, modelo y flujo).
> Convenciones:
>
> - TypeScript estricto.
> - Lógica pura en `packages/core` con tests en Vitest.
> - Toda tarea termina con un PR verde en CI y una nota en `docs/CHANGELOG.md`.
> - Ninguna tarea añade servicios de pago.

**Total: 20 tareas en 4 semanas.**

| Semana              | Tareas      | Meta de la semana                                      |
| ------------------- | ----------- | ------------------------------------------------------ |
| 1. Cimientos        | T-01 a T-05 | Repo, BD, deploy, zona y fixtures                      |
| 2. Núcleo           | T-06 a T-11 | Parseo, celdas, antitrampas y ligas en `packages/core` |
| 3. Backend y subida | T-12 a T-15 | De subir un archivo a ver celdas conquistadas          |
| 4. Juego visible    | T-16 a T-20 | Mapa, ranking, admin y operación                       |

---

## Semana 1: Cimientos

### T-01 · Scaffolding del monorepo

- **Objetivo:** crear la estructura de ARQUITECTURA §3 con pnpm workspaces: `apps/web` (Vite + React + TS + `vite-plugin-pwa`), `packages/core` (TS puro, sin DOM), `supabase/`, `fixtures/` y `scripts/`.
- **Criterios de aceptación:**
  - `pnpm i && pnpm build && pnpm test` pasan en limpio.
  - `packages/core` exporta una función de ejemplo con test.
  - ESLint y Prettier configurados.
  - GitHub Actions ejecuta lint, test y build en cada PR.
  - La PWA tiene un manifest válido y es instalable en Safari para iOS (ícono provisional).
- **Dependencias:** ninguna.

### T-02 · Esquema de base de datos y RLS

- **Objetivo:** escribir migraciones SQL en `supabase/migrations` con todas las tablas de ARQUITECTURA §4, PostGIS en el esquema `extensions`, índices y políticas RLS.
- **Criterios de aceptación:**
  - `supabase db reset` en local crea todo sin errores.
  - Tests SQL (o un script con supabase-js) demuestran que:
    - un usuario no puede leer `runs` ni `cell_efforts` de otro;
    - nadie puede escribir `cell_ownership` con la anon key;
    - `cell_ownership`, `zone_cells` y `daily_points` se leen sin login.
  - Los tipos TS se generan con `supabase gen types`.
- **Dependencias:** T-01.

### T-03 · Deploy de la web en Cloudflare Pages

- **Objetivo:** conectar el repo a Cloudflare Pages (plan Free) con deploys de preview por PR y producción desde `main`.
- **Criterios de aceptación:**
  - Hay una URL `*.pages.dev` pública que sirve la PWA.
  - Las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` están configuradas.
  - Cada PR genera su URL de preview.
  - Hay un documento `docs/DEPLOY.md` con los pasos.
- **Dependencias:** T-01. Augusto debe crear la cuenta de Cloudflare.

### T-04 · Zona MVP, script de zonas y seed

- **Objetivo:**
  - Dibujar en geojson.io el polígono de la pista de Jumeirah Beach a Kite Beach siguiendo ARQUITECTURA §7.2.
  - Crear `scripts/create-zone.ts`, que inserta `zones` y `zone_cells` con `polygonToCellsExperimental` (resolución 10, `containmentOverlapping`).
  - Crear el seed con las 4 ligas de PRODUCTO §3.7 y la temporada 1.
- **Criterios de aceptación:**
  - `supabase/seed/zones/jumeirah-kite.geojson` es válido.
  - El script es idempotente.
  - Se imprime el número real de celdas y se anota en ARQUITECTURA §7.3 en sustitución de la estimación.
  - Una captura del polígono sobre el mapa queda en el PR para que **Augusto lo apruebe**.
- **Dependencias:** T-02.

### T-05 · Fixtures de prueba (GPX y FIT)

- **Objetivo:** crear `scripts/make-fixture.ts`, que genera GPX sintéticos sobre el eje de la pista, y versionar estos casos en `fixtures/`:
  - carrera válida a 5:00/km de 5 km;
  - carrera válida a 6:30/km;
  - bici a 30 km/h;
  - teletransporte de 500 m;
  - hueco de 2 min;
  - pico de GPS;
  - fecha futura;
  - menos de 1 km en la zona;
  - archivo duplicado;
  - copia de otro usuario;
  - GPX sin `<time>`.
    Además, 1 o 2 FIT reales anonimizados aportados por Augusto, recortados a la zona y sin la parte de casa.
- **Criterios de aceptación:**
  - Cada fixture tiene un `.json` gemelo con el resultado esperado (estado, motivo y número aproximado de celdas).
  - Ningún fixture contiene datos personales fuera de la zona.
- **Dependencias:** T-01. Usa los extremos aproximados si T-04 no está terminada.

---

## Semana 2: Núcleo (`packages/core`)

### T-06 · Parser GPX

- **Objetivo:** `parseGpx(text): RawPoint[]` con `fast-xml-parser`. Lee `trkpt` (lat, lon, time), `<type>` si existe y extensiones comunes de cadencia y frecuencia cardiaca.
- **Criterios de aceptación:**
  - Funciona en el navegador y en Deno (sin APIs del DOM).
  - Pasa los fixtures de T-05.
  - Si falta el `time`, lanza el error tipado `NO_TIMESTAMPS`.
  - Procesa un GPX de 3 h a 1 Hz en menos de 300 ms en Node (medido en el test).
- **Dependencias:** T-01 y T-05.

### T-07 · Parser FIT

- **Objetivo:** `parseFit(bytes): RawPoint[]` con `@garmin/fitsdk` (Decoder, Stream). Convierte semicírculos a grados, lee `session.sport` y normaliza la cadencia a pasos por minuto.
- **Criterios de aceptación:**
  - Valida con `isFIT` y `checkIntegrity`; un FIT corrupto da el error `INVALID_FILE`.
  - Pasa los FIT de T-05.
  - El deporte se expone como `running`, `cycling` u `other`.
  - Funciona en Deno (importado como `npm:`).
- **Dependencias:** T-01 y T-05.

### T-08 · Normalización y recorte a la zona

- **Objetivo:** `normalize(points)`, que ordena, elimina duplicados y descarta picos de más de 12 m/s, y `clipToZone(points, polygon, bufferM = 30)`, que devuelve tramos continuos partidos por huecos de más de 30 s o saltos de más de 100 m. También calcula la distancia acumulada con haversine.
- **Criterios de aceptación:**
  - Fixtures de teletransporte y hueco: salen 2 tramos.
  - Fixture de pico: se elimina el punto.
  - No sale ningún punto de fuera de la zona.
  - Cobertura de tests ≥ 90 % del módulo.
- **Dependencias:** T-06 (T-07 opcional).

### T-09 · Motor de celdas H3 y marca por celda

- **Objetivo:** `computeCellEfforts(segments, res, zoneCells)`:
  - asigna una celda a cada punto e interpola el instante de cada cruce;
  - calcula la marca con la ventana de 1 km centrada (PRODUCTO §3.2, incluido el desplazamiento en los bordes);
  - guarda la mejor marca por celda;
  - redondea a s/km.
- **Criterios de aceptación:**
  - Fixture de 5:00/km: todas las marcas en 300 ± 3 s/km.
  - Un tramo de menos de 1 km no produce marcas.
  - Una ida y vuelta conserva la mejor marca.
  - Se ignoran las celdas que no están en `zoneCells`.
  - Las funciones son puras y deterministas.
- **Dependencias:** T-08.

### T-10 · Antitrampas

- **Objetivo:** `checkRun(meta, segments, context)`, que devuelve `accepted`, `review` o `rejected`, con códigos y flags según la tabla de ARQUITECTURA §6. Los umbrales van en un objeto de configuración.
- **Criterios de aceptación:**
  - Cada fixture de T-05 da exactamente el resultado esperado de su `.json`.
  - Los umbrales se pueden cambiar sin tocar la lógica.
  - Las comprobaciones que necesitan la BD (duplicados, copias, límite diario y ventana de 72 h) reciben datos por `context` y se prueban con mocks.
  - Se genera el `track_hash` descrito en §6.
- **Dependencias:** T-08 (T-07 para el deporte del FIT).

### T-11 · Ligas: ritmo de referencia y ascensos

- **Objetivo:** funciones puras `bestKmWindow(segments)`, `assignLeague(refPace, bands)` y `resolveLeagueForRun(current, runBest, bands)` según PRODUCTO §3.7: liga provisional, ascenso inmediato y ningún descenso a mitad de temporada.
- **Criterios de aceptación:**
  - Tests de los casos borde: exactamente 4:15/km, primera carrera, ascenso en una carrera y carrera lenta que no hace bajar de liga.
  - Las bandas se leen de la configuración (tabla `leagues`).
- **Dependencias:** T-09.

---

## Semana 3: Backend y subida

### T-12 · Motor de conquista en SQL

- **Objetivo:** funciones Postgres `apply_run(run_id, efforts jsonb)` y `recompute_season(season_id)`:
  - conquistar, robar si la marca es estrictamente menor, mejorar y defender;
  - desempate a favor de quien la logró primero según la hora de la carrera;
  - escribir `ownership_events`;
  - bloquear con `FOR UPDATE`.
- **Criterios de aceptación:**
  - Tests SQL (pgTAP o un script) cubren conquista, robo, empate (gana el más antiguo), mejora propia y dos ligas independientes en la misma celda.
  - Una carrera anulada seguida de `recompute_season` deja el mismo estado que si nunca hubiera existido.
  - Dos `apply_run` concurrentes sobre la misma celda no se pisan (el test ejecuta 2 conexiones en paralelo).
- **Dependencias:** T-02. Recibe las marcas con el formato que define T-09, así que conviene acordar primero el tipo `CellEffort`.

### T-13 · Edge Function `process-run` y medición de CPU

- **Objetivo:** función Deno que ejecuta el flujo de ARQUITECTURA §5, pasos 5 a 13: descarga desde Storage, parseo, normalización, antitrampas, celdas, liga, `apply_run` y actualización de `runs`.
- **Criterios de aceptación:**
  - En local (`supabase functions serve`) cada fixture deja `runs.status` y `reject_code` como se espera.
  - Es idempotente: reprocesar el mismo `run_id` no duplica nada.
  - Hay un informe de CPU medido con un FIT de 3 h. Si se acerca al límite de 2 s, se aplica el submuestreo o el tope de puntos de §5 y se documenta.
  - Los errores se registran sin datos personales.
- **Dependencias:** T-07, T-09, T-10, T-11 y T-12.

### T-14 · Autenticación y perfil

- **Objetivo:** login con Google mediante Supabase Auth y flujo de email OTP **listo pero detrás de un flag** (`VITE_EMAIL_LOGIN`) hasta que haya dominio y SMTP (ARQUITECTURA §2.1). En el primer login, pantalla para elegir un alias único.
- **Criterios de aceptación:**
  - Login y logout funcionan en la URL de producción de Cloudflare.
  - Se crea la fila de `profiles` en el primer login.
  - El alias se valida (3 a 20 caracteres, único).
  - Con el flag activo y el SMTP por defecto, el OTP llega a un miembro del equipo del proyecto.
  - Hay un documento `docs/AUTH.md` con los pasos para activar Resend o Brevo cuando haya dominio.
- **Dependencias:** T-02 y T-03. Augusto debe crear el cliente OAuth en Google Cloud (gratis).

### T-15 · Pantalla "Subir carrera"

- **Objetivo:** selector de `.gpx` o `.fit` de hasta 10 MB con estos pasos:
  1. vista previa local con `packages/core` (recorrido en la zona y celdas tocadas);
  2. SHA-256;
  3. subida a `runs-raw/{user_id}/` (bucket privado);
  4. `INSERT runs` e invocación de `process-run`;
  5. pantalla de resultado: conquistadas, robadas, defendidas, liga o motivo del rechazo, en español.
- **Criterios de aceptación:**
  - Funciona en Safari para iPhone con archivos de la app Archivos.
  - Rechaza en el cliente los archivos de más de 10 MB y las extensiones no admitidas.
  - Tiene una guía corta de "cómo exportar desde Strava o Garmin".
  - Muestra el estado mientras procesa.
- **Dependencias:** T-13 y T-14.

---

## Semana 4: Juego visible y operación

### T-16 · Mapa de celdas coloreadas

- **Objetivo:** mapa con MapLibre GL y teselas de OpenFreeMap, con atribución, que pinta las `zone_cells` de la zona activa coloreadas por `cell_ownership` de la liga elegida:
  - mías, de otros y libres;
  - selector de liga;
  - detalle de celda con dueño, marca, fecha, mi mejor marca y "te faltan X s/km".
- **Criterios de aceptación:**
  - Carga en menos de 3 s en 4G con unas 120 celdas.
  - Funciona sin login (en modo lectura).
  - Es usable en un iPhone en vertical.
  - Nunca muestra recorridos de otros corredores.
- **Dependencias:** T-04 y T-12.

### T-17 · Puntos diarios y ranking de temporada

- **Objetivo:**
  - Job `pg_cron` a las 19:59 UTC (23:59, hora del Golfo) que escribe `daily_points` con las reglas de PRODUCTO §3.8.
  - Job de cierre de temporada que congela el ranking y activa la siguiente.
  - Página de ranking por liga con los desempates.
- **Criterios de aceptación:**
  - Tests con datos sembrados que verifican los puntos (+1 por celda y día, +2 por robo, +1 por conquista) y los 3 desempates.
  - El cierre archiva la temporada y la siguiente arranca con el mapa vacío.
  - La página muestra los días restantes y mi posición.
  - Los jobs se pueden lanzar a mano para probarlos.
- **Dependencias:** T-12.

### T-18 · Panel de admin mínimo

- **Objetivo:** ruta `/admin`, solo para `profiles.is_admin`, con:
  - la cola de carreras en `review` y los reportes;
  - una vista del recorrido y los flags;
  - los botones "aprobar" y "anular", que llaman a `recompute_season`.
- **Criterios de aceptación:**
  - Un usuario que no es admin recibe 403, también por RLS y no solo en la interfaz.
  - Aprobar una carrera en revisión aplica sus celdas.
  - Anular una carrera recalcula el mapa y los puntos.
  - Cada acción queda registrada (quién, cuándo y por qué).
- **Dependencias:** T-12 y T-13.

### T-19 · Perfil, historial y avisos

- **Objetivo:**
  - Página de perfil: alias, liga, ritmo de referencia, celdas actuales e historial de carreras con su estado y motivo.
  - Aviso dentro de la app ("Te robaron 3 celdas") leído de `ownership_events`.
  - Botón "reportar carrera" en el detalle de celda.
- **Criterios de aceptación:**
  - Los avisos se marcan como leídos.
  - El reporte crea una fila en `reports`.
  - El usuario puede borrar una carrera propia: se anula y se recalcula.
  - El usuario puede pedir el borrado de su cuenta. Queda documentado en `docs/PRIVACIDAD.md`.
- **Dependencias:** T-15. T-18 para el recálculo.

### T-20 · Operación: anti-pausa, backups y prueba de punta a punta

- **Objetivo:**
  - GitHub Action semanal que hace ping a Supabase (evita la pausa tras 7 días sin actividad) y un `pg_dump` cifrado como artefacto privado.
  - Borrado automático de los archivos originales de más de 30 días.
  - Prueba de punta a punta (Playwright) que: inicia sesión con un usuario de prueba, sube 2 fixtures de usuarios distintos, comprueba un robo en el mapa y el ranking.
- **Criterios de aceptación:**
  - Las Actions corren en verde.
  - Hay una restauración probada en un proyecto local.
  - La prueba de punta a punta pasa en CI.
  - Un checklist de lanzamiento del piloto en `docs/LANZAMIENTO.md` (sin enviar nada a nadie).
- **Dependencias:** T-13 y T-17.

---

## Grafo de dependencias (resumen)

```
T-01 ─┬─ T-02 ─┬─ T-04 ───────────────┐
      │        ├─ T-12 ─┬─ T-16 ◄─────┘
      │        │        ├─ T-17 ─┐
      ├─ T-03 ─┤        └─ T-18  │
      │        └─ T-14 ─┐        │
      └─ T-05 ─┬─ T-06 ─ T-08 ─┬─ T-09 ─ T-11 ─┐
               └─ T-07         └─ T-10 ────────┴─ T-13 ─ T-15 ─ T-19
                                                  T-13 + T-17 ─ T-20
```

**Paralelizable:** en la semana 1, T-03 y T-05 en paralelo con T-02. En la semana 2, T-06 y T-07, y después T-09 y T-10. En la semana 4, T-16, T-17 y T-18.

## Fuera de la Fase 0 (no asignar todavía)

- Grabación en vivo en la PWA o en Expo Go (Fase 1).
- Importación directa desde Strava o Garmin Connect por API.
- Notificaciones push.
- Categorías de sexo y edad.
- Patrocinio de celdas.
- Pagos.
- Zonas Marina, Al Qudra y Downtown (solo datos, con el script de T-04, cuando se aprueben).
