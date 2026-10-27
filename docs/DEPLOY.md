# Despliegue

La web es un export estático (`apps/web/out`). No usa funciones de Vercel. El mismo artefacto sirve en Vercel Hobby ahora y en Cloudflare Pages cuando haya ingresos.

## Vercel Hobby (Fase 0, sin ingresos)

1. Importar el repositorio en Vercel con la cuenta que ya está conectada.
2. Root Directory: `apps/web`.
3. Framework: Next.js. pnpm se detecta por el `packageManager` de la raíz.
4. El install debe ejecutarse en la raíz del monorepo (Vercel lo hace si ve `pnpm-lock.yaml` arriba de `apps/web`). Si el install falla, fijar Install Command en `pnpm install` desde la raíz.
5. Build Command: `pnpm --filter @dubai-run/web build` (o el `next build` por defecto, que también genera `out/`). Los dos cargan `next.config.ts`, que copia el worker de MapLibre a `public/map/` antes de exportar. No hace falta un paso aparte ni una variable de entorno.
6. Variables, cuando existan, solo en el panel (nunca en git):
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://usduksotdecgusaxeyva.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = la anon key del proyecto `dubai-run-territory`
7. No hace falta la service role en la web. Esa clave se queda en Supabase y, más adelante, en la Edge Function.

Vercel Hobby no permite uso comercial. Mientras no haya ingresos, este destino es el acordado.

## Cloudflare Pages (cuando empiece a cobrar)

1. `pnpm build`.
2. Crear un proyecto Pages (plan Free) con directorio de salida `apps/web/out`.
3. Build command: `pnpm install && pnpm build`. Root directory: el repo.
4. Copiar las dos variables `NEXT_PUBLIC_*`. En Pages son variables de build, porque Next las incrusta al compilar.
5. El mapa, el manifest y el service worker no cambian: no hay runtime de Vercel que sustituir.

Límites del plan Free que importan: 500 builds al mes, un build a la vez, 20.000 archivos y 25 MiB por archivo. Este sitio estático cabe.

## CI

GitHub Actions (`.github/workflows/ci.yml`) corre lint, typecheck, tests y build en cada pull request. No despliega y no necesita secretos.
