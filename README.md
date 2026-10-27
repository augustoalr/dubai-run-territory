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

`pnpm zone:cells` regenera el polígono y las 99 celdas H3 de la zona a partir del eje de la pista.

## Estructura

```
apps/web/                 PWA (Next.js, mapa, textos es/en)
packages/core/            Zonas, buffer, celdas H3 y bandas de liga. Sin DOM
supabase/seed/zones/      GeoJSON de Jumeirah · Kite y la lista de celdas
scripts/create-zone.ts    Regenera esa zona
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

## Próximos pasos

El backlog está en [`docs/TAREAS.md`](docs/TAREAS.md). Esta base cubre el andamiaje (T-01, adaptado a Next.js), la preparación del despliegue estático (parte de T-03) y la geometría de la zona con el mapa de ejemplo (parte de T-04 y T-16). Siguen, en este orden:

1. T-02: migraciones, PostGIS y RLS.
2. T-04: insertar `zones` y `zone_cells` en Supabase y que Augusto apruebe el polígono.
3. T-05 a T-13: GPX/FIT, antitrampas y la Edge Function.
4. T-14 a T-20: login con Google, subida, ranking y admin.
