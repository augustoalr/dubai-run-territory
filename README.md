# Territorio

PWA para corredores de Dubái. Cada carrera conquista celdas hexagonales del mapa y cada liga tiene el suyo. Esta base muestra la pista de Jumeirah Beach a Kite Beach, con dueños de ejemplo. Las reglas están en [`docs/PRODUCTO.md`](docs/PRODUCTO.md) y el stack en [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md).

Costo cero: Next.js, MapLibre, OpenFreeMap, h3-js y, más adelante, Supabase Free. El hosting de la validación es Vercel Hobby. El build es un sitio estático, así que se puede mover a Cloudflare Pages cuando el proyecto empiece a cobrar.

## Cómo correrlo

Hace falta Node 22 y pnpm 10.

```bash
pnpm install
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000). La interfaz sale en español; el botón EN cambia los textos.

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

`pnpm build` deja el sitio en `apps/web/out`. Para ver esa carpeta:

```bash
python3 -m http.server 3000 --directory apps/web/out
```

`pnpm zone:cells` regenera el polígono y las 99 celdas H3 de la zona a partir del eje de la pista. `pnpm seed:sql` escribe la migración idempotente que inserta esa zona, las cuatro ligas y la temporada 1.

## Estructura

```
apps/web/                 PWA (Next.js, mapa, textos es/en)
packages/core/            Zonas, celdas H3, ligas y el tipo CellEffort. Sin DOM
supabase/migrations/      Esquema, RLS y seed de Jumeirah · Kite
supabase/seed/zones/      GeoJSON de la zona y la lista de celdas
scripts/                  Regenera la zona, el seed SQL y la prueba de RLS
docs/                     PRODUCTO, ARQUITECTURA, TAREAS, DEPLOY
```

Marina, Al Qudra y Downtown ya están en el catálogo de `packages/core`, en borrador y sin polígono. Añadir una zona es meter su geometría en ese catálogo y volver a cortar las celdas. No hace falta tocar el mapa.

## Mapa y celdas

- Teselas de [OpenFreeMap](https://openfreemap.org/) (estilo oscuro retocado, sin API key). MapLibre pone la atribución.
- Resolución H3 **10**: lado medio unos 66 m y área unos 15.000 m². Una celda se cruza en medio minuto a ritmo de club, así que la ventana de 1 km de las reglas mide una carrera de verdad y no un sprint de GPS. La 9 se come playa y carretera; la 11 parpadea con el error del reloj.
- El eje sale de OpenStreetMap (way 332925290, Jumeirah Corniche Running Track), unos 6,85 km. El polígono es un pasillo de 25 m a cada lado. **Son coordenadas aproximadas.** Hay que validarlas con una carrera real.

## Variables

Copia `.env.example` a `apps/web/.env.local` cuando haya anon key. Sin esa clave la app abre igual: el mapa no llama a Supabase todavía.

El proyecto es `dubai-run-territory` (`usduksotdecgusaxeyva`, `ap-south-1`).

## Base de datos

Las migraciones están en `supabase/migrations/`. Para aplicarlas al proyecto real, con el CLI de Supabase y sin guardar claves en el repo:

```bash
supabase link --project-ref usduksotdecgusaxeyva
supabase db push
```

Eso crea el esquema, el RLS y el seed de Jumeirah · Kite (zona en borrador, 99 celdas, 4 ligas, temporada 1 en `scheduled`). Los pasos y el contrato `CellEffort` están en [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) §4.

`pnpm db:verify` comprueba las migraciones contra un Postgres local. No usa el proyecto hospedado.

## Próximos pasos

El backlog está en [`docs/TAREAS.md`](docs/TAREAS.md). El esquema y el seed de la zona ya están en el repo. Augusto tiene que aplicar las migraciones y aprobar el polígono. Siguen los parsers, el antitrampas y la Edge Function (T-05 a T-13), y después el login y la subida (T-14 en adelante). Garmin y Polar podrán conectar cuentas; Strava no entra en la fase 0.
