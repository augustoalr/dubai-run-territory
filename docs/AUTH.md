# Autenticación y Perfil (T-14)

Guía completa para la configuración y operación de la autenticación de usuarios en Territorio.

---

## 1. Variables de entorno requeridas

En `apps/web/.env.local` (local) o en la configuración de entorno del hosting (Vercel / Cloudflare Pages):

| Variable                        | Tipo                  | Descripción                                                                                              | Obligatoria |
| ------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------- | ----------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | URL                   | URL pública del proyecto Supabase (ej. `https://usduksotdecgusaxeyva.supabase.co`).                      | Sí          |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | string                | Clave anónima pública (`anon key`). Nunca expone la clave `service_role`.                                | Sí          |
| `NEXT_PUBLIC_EMAIL_LOGIN`       | `"true"` \| `"false"` | Flag para habilitar el login con Email OTP. Si está ausente o es `"false"`, solo se ofrece Google OAuth. | Opcional    |

> [!NOTE]
> La aplicación está configurada con `output: "export"` (sitio 100 % estático). No requiere ni utiliza rutas de servidor API de Next.js, middleware ni `@supabase/ssr`. La autenticación se resuelve en el navegador mediante el cliente desacoplado en `apps/web/src/lib/supabase/` con flujo PKCE y detección de sesión en URL (`/auth/callback`).

---

## 2. Configuración gratuita de Google Cloud OAuth en Supabase

Para permitir que los corredores inicien sesión con su cuenta de Google:

### Paso 2.1: Crear el proyecto en Google Cloud Console

1. Entra en [Google Cloud Console](https://console.cloud.google.com/) con tu cuenta de Google.
2. Crea un proyecto nuevo (por ejemplo: `dubai-run-territory`) o selecciona uno existente.
3. El uso básico de OAuth 2.0 es **100 % gratuito** y no requiere tarjeta de crédito para este alcance.

### Paso 2.2: Configurar la pantalla de consentimiento de OAuth

1. En el menú lateral, ve a **APIs y servicios** > **Pantalla de consentimiento de OAuth**.
2. Selecciona **Tipo de usuario: Externo** y haz clic en **Crear**.
3. Rellena los datos básicos de la app:
   - **Nombre de la aplicación:** `Territorio · Runners Dubái`
   - **Correo de asistencia del usuario:** tu dirección de correo.
   - **Datos de contacto del desarrollador:** tu dirección de correo.
4. En la pestaña **Permisos (Scopes)**:
   - Haz clic en **Añadir o quitar permisos**.
   - Selecciona `.../auth/userinfo.email`, `.../auth/userinfo.profile` y `openid`.
   - Haz clic en **Actualizar** y luego en **Guardar y continuar**.
5. En la pestaña **Usuarios de prueba**:
   - Mientras la app esté en modo prueba, añade las direcciones de correo del equipo para probar el login.
   - Haz clic en **Guardar y continuar**.

### Paso 2.3: Crear credenciales OAuth 2.0

1. En el menú lateral, ve a **APIs y servicios** > **Credenciales**.
2. Haz clic en **Crear credenciales** > **ID de cliente de OAuth**.
3. Selecciona **Tipo de aplicación: Aplicación web**.
4. Asigna un nombre: `Supabase Auth - Territorio`.
5. En **Orígenes autorizados de JavaScript**, añade:
   - `https://usduksotdecgusaxeyva.supabase.co`
   - `http://localhost:3000` (desarrollo local)
   - Tu dominio de producción (ej. `https://dubairun.pages.dev` o `https://tu-dominio.com`).
6. En **URIs de redireccionamiento autorizados**, añade la URL de callback de tu proyecto Supabase:
   - `https://usduksotdecgusaxeyva.supabase.co/auth/v1/callback`
7. Haz clic en **Crear**. Guarda el **ID de cliente** (`Client ID`) y el **Secreto de cliente** (`Client Secret`).

### Paso 2.4: Conectar Google en Supabase Dashboard

1. Entra en tu panel de control de [Supabase Dashboard](https://supabase.com/dashboard/project/usduksotdecgusaxeyva).
2. Ve a **Authentication** > **Providers** > **Google**.
3. Activa la opción **Enable Sign in with Google**.
4. Pega el **Client ID** y el **Client Secret** obtenidos de Google Cloud.
5. Haz clic en **Save**.

### Paso 2.5: Configurar las URLs de redirección en Supabase

1. En Supabase Dashboard, ve a **Authentication** > **URL Configuration**.
2. **Site URL:** `https://tu-dominio.com` (o `http://localhost:3000` en desarrollo).
3. **Redirect URLs:** añade:
   - `http://localhost:3000/auth/callback`
   - `https://tu-dominio.com/auth/callback`
   - `https://*.pages.dev/auth/callback` (para vistas previas)
4. Guarda los cambios.

---

## 3. Conexión de SMTP para Email OTP (cuando haya dominio propio)

Hasta contar con dominio propio verificado con registros DNS (SPF, DKIM, DMARC), el envío de correos masivos o transaccionales está limitado por los filtros antispam. Por defecto, el flag `NEXT_PUBLIC_EMAIL_LOGIN` permanece inactivo (`false`).

Cuando se disponga de dominio propio (ej. `dubairun.app`):

### Opción A: Resend (Recomendada, gratuita)

1. Crea una cuenta gratuita en [Resend](https://resend.com) (incluye 3.000 correos/mes y 100/día gratis).
2. Ve a **Domains** > **Add Domain** e introduce tu dominio (ej. `dubairun.app`).
3. Añade los registros DNS proporcionados por Resend en tu proveedor de dominio:
   - Registro `TXT` (SPF).
   - Registros `CNAME` (DKIM).
   - Registro `MX` (feedback / routing).
4. Ve a **API Keys** y genera una clave de API con permisos de envío.
5. En Supabase Dashboard > **Authentication** > **SMTP Settings**:
   - **Enable Custom SMTP:** Activado.
   - **Sender email:** `no-reply@dubairun.app`
   - **Sender name:** `Territorio`
   - **Host:** `smtp.resend.com`
   - **Port:** `465` (SSL) o `587` (TLS)
   - **User:** `resend`
   - **Password:** `<TU_API_KEY_DE_RESEND>`
6. Haz clic en **Save**.

### Opción B: Brevo (Sendinblue, alternativa gratuita)

1. Regístrate en [Brevo](https://www.brevo.com) (plan gratuito con 300 correos/día sin límite mensual).
2. Añade y valida tu dominio con registros SPF, DKIM y DMARC.
3. En **Transaccional** > **Configuración** > **SMTP & API**, copia tus credenciales SMTP.
4. En Supabase Dashboard > **Authentication** > **SMTP Settings**:
   - **Host:** `smtp-relay.brevo.com`
   - **Port:** `587`
   - **User:** tu login SMTP de Brevo.
   - **Password:** tu contraseña SMTP de Brevo.
   - **Sender email:** `no-reply@tu-dominio.com`

Una vez configurado y validado el envío de emails, activa la variable de entorno:

```bash
NEXT_PUBLIC_EMAIL_LOGIN=true
```

---

## 4. Flujo de Onboarding de Alias

El trigger `on_auth_user_created` en Supabase crea automáticamente la fila en `public.profiles` con `alias = NULL`:

```sql
INSERT INTO public.profiles (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;
```

Cuando un usuario inicia sesión y su fila en `public.profiles` tiene `alias === null`:

1. La aplicación muestra el modal bloqueante `AliasOnboardingModal`.
2. El usuario no puede navegar ni registrar carreras sin haber escogido un alias público.
3. Validación en cliente y base de datos:
   - Entre 3 y 20 caracteres.
   - Sin espacios en blanco ni caracteres de control (`alias !~ '[[:cntrl:][:space:]]'`).
   - Unicidad garantizada por el índice `profiles_alias_lower_uidx`.
4. Si el alias ya está ocupado por otro corredor, se informa amigablemente para que elija una alternativa.
5. Una vez guardado el alias, el modal se desbloquea de forma inmediata sin recargar la página.
