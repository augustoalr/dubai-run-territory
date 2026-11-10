# Cómo trabaja el equipo

Reglas para que un corte de créditos no deje el repo a medias. Están en español a propósito: el producto y los PR también lo están.

## Tareas cortas

- Una tarea del backlog (`docs/TAREAS.md`) cabe en una sesión corta, del orden de una o dos horas, y sale en **su propio PR**.
- No mezcles dos tareas grandes en la misma rama. Si una se alarga, pártala y deja el resto escrito en `docs/ESTADO.md`.

## Commit y push

- Haz commit y push en cuanto el paso compile: `pnpm lint`, `pnpm typecheck` y `pnpm test` en verde, o el subconjunto que ese paso ya pueda pasar.
- No acumules el trabajo solo en el disco de la sesión. Lo que no está en el remoto se pierde si se cortan los créditos.

## Estado

- `docs/ESTADO.md` es la fuente de verdad al retomar. Ahí consta, por tarea, qué está hecho, qué falta y **el siguiente paso exacto**.
- Actualízalo en el mismo PR que cambia el código. No lo dejes para el final de la semana.

## Ramas

- Ramas cortas, con el prefijo que pida el entorno (aquí `cursor/…-b408`).
- Antes de abrir el PR, actualiza la rama con `main`. El diff del PR debe ser solo esa tarea.
- Si `main` avanza mientras el PR está abierto (otro PR se mergea, a menudo en squash), vuelve a actualizar la rama y deja el CI verde.

## Áreas en paralelo

- No toques el directorio de otro agente que esté trabajando a la vez. Si el encargo dice que otro lleva `supabase/` o el mapa, no los edites.
- Leer un archivo de esa zona para no pisarlo está bien. Escribirlo, no.

## Al retomar tras un corte

1. Lee `docs/ESTADO.md` antes de escribir código.
2. `git fetch origin main` y actualiza tu rama con `main`.
3. Sigue el siguiente paso exacto de la tarea en curso. No reabras trabajo que el estado marque como hecho.

## Reglas técnicas permanentes

- **Sitio estático puro:** La app usa `output: "export"`. Nada de rutas de servidor (`/api`), Server Actions, middleware de Next.js ni `@supabase/ssr`. Todo lo que requiera backend o secretos se ejecuta exclusivamente en Supabase (Postgres/RLS o Edge Functions en Deno).
- **Austeridad de dependencias:** Antes de instalar una librería externa, revisa si ya está en `package.json` y reutiliza lo existente. Nunca dupliques clientes ni funciones de utilidad.
- **Resiliencia y funcionamiento offline/degradado:** Grabar una carrera y visualizar el mapa nunca pueden depender del inicio de sesión ni de servicios externos sin configurar. Si falta una clave o configuración, la app debe seguir funcionando en modo local/degradado sin romperse.
- **Internacionalización estricta:** Todo texto visible en pantalla debe residir en los diccionarios `es` y `en` (`apps/web/src/i18n/dictionaries.ts`), manteniendo simetría total de claves.
- **Seguridad y secretos:** Jamás incluir secretos en git. La `service_role` key nunca debe llegar al frontend ni a variables `NEXT_PUBLIC_*`.
- **Agnosticismo de base de datos:** No tocar `supabase/migrations/` ni alterar esquemas a menos que la tarea lo exija expresamente.
- **Experiencia móvil:** Toda la interfaz debe ser completamente fluida y usable en iPhone con Safari en orientación vertical (375 a 430 px).

## Manager del proyecto

El rol de manager / jefe (quién decide la siguiente tarea, escribe los prompts para los programadores y revisa los PR) está documentado en [`docs/MANAGER.md`](docs/MANAGER.md). Quien retome ese rol debe leer ese archivo junto con este `AGENTS.md` y `docs/ESTADO.md`.
