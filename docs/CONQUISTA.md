# Conquista de celdas

`public.apply_run(run_id, efforts jsonb)` y `public.recompute_season(season_id)` viven en la migración `20261029160000_apply_run.sql`. No está aplicada en el Supabase remoto: se prueba en local con `pnpm db:verify`.

La marca ya llega redondeada a 1 s/km (`paceS` de `CellEffort`). Menor es más rápido. La ventana de 1 km se comprueba (1000 m ± 1 mm) y no se vuelve a calcular aquí.

## Quién se queda la celda

Comparación dentro de la misma zona, temporada y liga. Otra liga es otro mapa.

| Situación                       | Resultado                                           | Evento                                                         |
| ------------------------------- | --------------------------------------------------- | -------------------------------------------------------------- |
| Nadie la tiene                  | Entra el corredor                                   | `conquest` (+1 punto)                                          |
| Ritmo estrictamente menor       | Se la queda el nuevo                                | `steal` si es otro (+2), `improve` si ya era suya              |
| Mismo ritmo, cruzó antes        | Se la queda quien cruzó antes                       | `steal` o `improve`                                            |
| Mismo ritmo y mismo instante    | Desempata la subida más antigua (`runs.created_at`) | igual                                                          |
| No es más rápido ni más antiguo | Sigue el dueño                                      | `defend` si quien llega es otro; si es el mismo, no hay evento |

## Qué carreras entran

- `runs.status = accepted`.
- Temporada `active` (un recálculo puede repasar la temporada que se está cerrando).
- `started_at` dentro de `[starts_at, ends_at]`.
- `created_at` como mucho 72 h después de `ended_at`.

## Recálculo

`recompute_season` borra marcas, dueños, eventos y la foto de puntos de esa temporada, y vuelve a aplicar solo las carreras que siguen cumpliendo lo de arriba, en orden de subida. Anular una carrera (`voided`) y recalcular deja el mapa como si no hubiera existido.

`snapshot_daily_points(season_id, day)` reescribe la foto de ese día (hora del Golfo): celdas poseídas al cierre del día, más 1 por conquista y 2 por robo acumulados hasta entonces.

Las tres funciones son `SECURITY DEFINER` con `search_path` vacío. Solo `service_role` puede ejecutarlas.
