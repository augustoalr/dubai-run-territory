# Guía rápida para Augusto: cómo hablar con el Manager

## 1. Empezar el día (conversación "Manager")

Haz git pull en main, lee ESTADO.md y dame el prompt de la siguiente tarea, revisado contra las reglas permanentes de AGENTS.md.

## 2. Cuando un programador termina

Pega al Manager la última línea que te dio el programador:
Manager: revisa el PR #N (T-XX)

## 3. Si el Manager pide arreglos

Pega su prompt nuevo en la MISMA conversación de esa tarea. Cuando termine, repite el paso 2.

## 4. Si algo falla o no entiendes

Explícame esto en palabras simples y dime qué hago yo.

## 5. Antes de pegar cualquier prompt (opcional pero recomendado)

Revisa tu prompt contra las reglas permanentes de AGENTS.md y ESTADO.md antes de que lo pegue.

## 6. Al final del día

Dame el informe del día: qué se fusionó, qué quedó pendiente y qué me toca hacer a mí.

## Reglas de oro

- Una tarea = una conversación, con el número en el nombre (ej. "T-14 Auth").
- Usa la conversación que diga el encabezado del prompt (NUEVA o existente).
- Antes de dar un prompt, el Manager revisará la tabla de conversaciones de ESTADO.md. Si la tarea ya existe, te dará un prompt marcado como `EXISTENTE: <nombre>` para que lo pegues en la misma conversación.
- Cada vez que abras una conversación nueva, el Manager la registrará de inmediato en la tabla de conversaciones de ESTADO.md.
- Si el veredicto es APROBADO y el CI está en verde, el Manager fusiona él mismo con `gh pr merge <N> --squash --delete-branch`, hace `git pull` en `main`, actualiza `ESTADO.md` y confirma a Augusto que quedó en `main`. Nunca le pide a Augusto que fusione.
- Si el Manager habla de algo que ya está hecho, dile: "Haz git pull en main y vuelve a leer ESTADO.md".
- Si sale un error 503 o "No capacity", es Google: espera unos minutos y escribe "continúa".
- Nunca pegues claves ni contraseñas en el chat.

## Cómo leer la respuesta del Manager

- Ignora las líneas "Ran…", "Checked…" y "Timed…": son el Manager trabajando.
- Busca al final solo dos cosas:
  1. **Veredicto**: "APROBADO" (se puede fusionar) o "CAMBIOS" (hay arreglos).
  2. **Siguiente paso**: qué hace él y qué te toca a ti.
- Si dice "aprobado" pero no fusionó, escríbele: `Fusiónalo tú con gh y confírmame que quedó en main.`
- Si pide arreglos, copia el prompt de arreglos y pégalo en la MISMA conversación de la tarea (por ejemplo "T-14 Auth").
- Si no entiendes la respuesta, escríbele: `Explícame en 3 frases qué tengo que hacer yo ahora.`
