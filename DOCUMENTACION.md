# Govbidder Challenge Dashboard — Documentación Completa

> **Versión:** Mayo 2026 · **Autor:** Equipo Govbidder  
> Este documento cubre absolutamente todo el sistema: arquitectura, funcionalidades, XP, admin, infraestructura y checklist de lanzamiento.

---

## Índice

1. [¿Qué es el Govbidder Challenge?](#1-qué-es-el-govbidder-challenge)
2. [Stack tecnológico](#2-stack-tecnológico)
3. [Flujo de autenticación](#3-flujo-de-autenticación)
4. [Sistema de puntos (XP)](#4-sistema-de-puntos-xp)
5. [Sistema de niveles](#5-sistema-de-niveles)
6. [Las 4 Fases del Challenge](#6-las-4-fases-del-challenge)
7. [Entregables con IA](#7-entregables-con-ia)
8. [Video Cápsulas](#8-video-cápsulas)
9. [Llamada en Vivo](#9-llamada-en-vivo)
10. [Leaderboard](#10-leaderboard)
11. [Tutorial de Onboarding](#11-tutorial-de-onboarding)
12. [Panel de Administración](#12-panel-de-administración)
13. [Integración con Hotmart](#13-integración-con-hotmart)
14. [Base de datos — Tablas](#14-base-de-datos--tablas)
15. [Variables de entorno](#15-variables-de-entorno)
16. [Infraestructura y deploy](#16-infraestructura-y-deploy)
17. [Cómo operar durante el lanzamiento](#17-cómo-operar-durante-el-lanzamiento)
18. [Pendientes antes del lanzamiento](#18-pendientes-antes-del-lanzamiento)
19. [Seguridad y anti-cheat](#19-seguridad-y-anti-cheat)

---

## 1. ¿Qué es el Govbidder Challenge?

El **Govbidder Challenge** es un programa de 4 días donde los participantes aprenden a posicionarse para obtener contratos del gobierno federal de EE.UU. (licitaciones públicas). Los usuarios acceden via un dashboard web privado tras comprar el acceso en Hotmart.

### Dinámica general

- **4 fases** (días), desbloqueadas progresivamente por el admin
- Cada fase tiene tareas, entregables generados con IA, y videos de formación
- Un sistema de **gamificación** con puntos (XP), niveles y leaderboard público genera engagement
- Al completar cada fase, el usuario gana XP y su progreso queda guardado en la base de datos
- Una **llamada en vivo** por fase (Zoom/YouTube Live) otorga puntos adicionales al unirse

### URL del dashboard
```
https://govbidder-challenge.vercel.app
```

---

## 2. Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router + Turbopack) |
| UI | React 19 (Server + Client Components) |
| Estilos | Tailwind CSS v4 (sin archivo de config — todo en CSS) |
| Base de datos | Supabase (PostgreSQL) |
| Autenticación | Supabase Auth (Magic Links + Google OAuth) |
| Email (Magic Links) | Gmail SMTP via Supabase |
| IA | Anthropic Claude API (`claude-3-5-haiku-20241022`) |
| Deploy | Vercel (deploy automático en push a `main`) |
| Repositorio | GitHub — `Juampii01/Dashboard-de-Lanzamiento` (rama `main`) |

---

## 3. Flujo de autenticación

Los usuarios acceden de **dos formas**:

### 3a. Magic Link (email sin contraseña)

1. El usuario ingresa su email en `/login`
2. Supabase envía un email con un link de un solo uso
3. El link apunta a `/auth/confirm` (página cliente)
4. La página cliente ejecuta el intercambio de código con Supabase
5. Si el intercambio es exitoso → redirige a `/dashboard`
6. Si el link expiró → redirige a `/login?error=auth` con mensaje de error

> **¿Por qué `/auth/confirm` y no el callback directo?**  
> Gmail y otros clientes de email pre-cargan los links para detectar spam. Eso consumía el OTP antes de que el usuario lo usara. La página `/auth/confirm` es renderizada por el servidor como HTML estático — Gmail la descarga pero no ejecuta el JavaScript. Cuando el usuario real hace clic, el JS corre y el intercambio funciona correctamente.

### 3b. Google OAuth

1. El usuario hace clic en "Entrar con Google"
2. Redirige a Google → usuario autoriza → Google redirige a `/auth/callback`
3. El callback server-side intercambia el código y redirige a `/dashboard`

### 3c. Control de acceso

- Cada usuario tiene un campo `access_expires_at` en la tabla `users`
- Cuando el acceso expira, el middleware redirige a `/dashboard/expirado`
- El dashboard principal verifica el acceso en el layout server-side

### Configuración de email SMTP

Supabase gratuito tiene un límite de 2 emails/hora. Para producción, configuramos Gmail SMTP:
- **Host:** `smtp.gmail.com` · **Puerto:** `587`
- **Usuario:** cuenta de Gmail del negocio
- **Contraseña:** App Password de Google (no la contraseña normal)
- Se configura en: Supabase Dashboard → Authentication → SMTP Settings

---

## 4. Sistema de puntos (XP)

El sistema de puntos es el corazón de la gamificación. Cada acción tiene un valor fijo, límites y protección anti-abuso.

### Tabla completa de XP

| Acción | Puntos | Cooldown / Límite | Implementación |
|--------|--------|-------------------|----------------|
| **Heartbeat** (tiempo en pantalla) | +5 pts | Cada 10 min · Máx 30 veces/día (150 pts/día) | Automático, invisible |
| **Click en avatar** (Santo) | +3 pts | 1 vez cada 60 min | Click en la barra de progreso |
| **Unirse a llamada en vivo** | +30 pts | 1 vez por día (guardado en DB) | Botón "Unirme a la llamada" |
| **Iniciar una fase** | +25 pts | 1 vez por fase (idempotente) | Al abrir `/dashboard/dia-N` |
| **Completar una fase** | +50 pts | 1 vez por fase (atómico) | Botón "Marcar como completada" |
| **Ver una video cápsula** | +10 pts | 1 vez por video · 5 min de cooldown | Al abrir el modal del video |

### Flujo técnico del XP

```
1. Usuario hace acción
2. API route verifica autenticación + cooldowns
3. Actualiza total_points en tabla users
4. Retorna { ok, delta, total }
5. Componente cliente dispara Custom Event "xp-gained"
6. PointsHUD escucha el evento → actualiza puntos mostrados + animación
```

### Anti-cheat: Heartbeat

El heartbeat es el mecanismo principal de XP por tiempo. Tiene dos guardas:

1. **Límite diario:** Máximo 30 pulsos por día (se resetea a medianoche según la fecha del sistema). El backend guarda `heartbeat_count_today` y `heartbeat_count_day` en la tabla `users`.

2. **Guard de actividad:** Si el usuario no mueve el mouse, hace clic, presiona teclas o scrollea por más de **5 minutos**, el heartbeat se pausa automáticamente. Cuando vuelve a estar activo, el timer se reanuda.

Los **admins** no tienen límite diario ni guard de actividad.

### Anti-cheat: Join-Call

La verificación de que el usuario ya se unió a la llamada **se guarda en la base de datos** (tabla `user_events`), no en localStorage. El localStorage solo se usa como cache de UI para no hacer un fetch innecesario. Si alguien limpia el localStorage, no obtiene XP doble.

---

## 5. Sistema de niveles

Los niveles se calculan dinámicamente en base a los puntos totales del usuario.

| Nivel | Puntos | Ícono |
|-------|--------|-------|
| Rookie | 0 – 99 | 🔰 |
| Contratista | 100 – 249 | ⚡ |
| Licitador | 250 – 499 | 🏛️ |
| Gov Pro | 500+ | 🏆 |

El nivel aparece en la **barra de progreso** (componente `progress-bar.tsx`) junto al avatar animado de Santo.

---

## 6. Las 4 Fases del Challenge

Las fases se desbloquean manualmente desde el panel de administración. Por defecto, solo el Día 1 está disponible.

### Día 1 — Identificá tu Nicho Federal

**Objetivo:** Que el usuario identifique a qué agencia del gobierno y con qué código NAICS puede vender sus servicios.

**Tareas del usuario:**
- Completar perfil de empresa (nombre, industria, descripción, servicios, ciudad, estado)
- El sistema sugiere automáticamente el código NAICS más relevante con IA
- El usuario puede aceptar la sugerencia o ingresar su propio código
- Al completar → guarda perfil en `company_profiles` → `+50 XP`

**Entregable:** PDF descargable con el análisis completo del perfil (`govbidder-dia-1-analisis.pdf`)

---

### Día 2 — Expandí tu Alcance con Códigos NAICS

**Objetivo:** Ampliar el perfil de la empresa con códigos NAICS secundarios y palabras clave de búsqueda.

**Tareas del usuario:**
- Ver el código NAICS primario del Día 1
- El sistema genera con IA hasta 5 códigos NAICS complementarios + keywords de búsqueda
- El usuario puede editar/ajustar los resultados

**Entregable:** PDF descargable con todos los códigos y keywords (`govbidder-dia-2-codigos.pdf`)

---

### Día 3 — Registrate en los Portales Clave

**Objetivo:** Conocer los portales federales y generar un preview de la web de la empresa orientada al gobierno.

**Tareas del usuario:**
- Revisar lista de portales federales clave (SAM.gov, beta.SAM, etc.)
- El sistema genera con IA un preview de cómo debería verse la web de la empresa
- Preview renderizado como HTML dentro del dashboard

**Portales incluidos:**
- SAM.gov (registro y licitaciones federales)
- FedBizOpps / beta.SAM (oportunidades de negocio)
- Otros portales relevantes

**Nota:** El Día 3 **no tiene PDF** — el entregable es el preview HTML dentro del dashboard.

---

### Día 4 — Capability Statement

**Objetivo:** Generar el documento más importante para licitar en el gobierno: el Capability Statement.

**Tareas del usuario:**
- El sistema genera con IA un Capability Statement completo basado en el perfil de Días 1-3
- El usuario puede descargar el documento

**Entregable:**
- PDF del Capability Statement (`govbidder-capability-statement.pdf`)
- También disponible como descarga de archivo de texto

---

## 7. Entregables con IA

Todos los endpoints de IA usan el modelo **`claude-3-5-haiku-20241022`** de Anthropic.

### Rate Limits por endpoint

| Endpoint | Límite personal | Límite global/día | Bypass admin |
|----------|----------------|-------------------|--------------|
| `/api/ai/suggest-naics` | 3 req / 60 seg | 50 req / 24h | ✅ |
| `/api/ai/expand-codes` | 5 req / 60 seg | 50 req / 24h | ✅ |
| `/api/ai/generate-web-preview` | 3 req / 5 min | 50 req / 24h | ✅ |
| `/api/ai/generate-capability-statement` | 3 req / 5 min | 50 req / 24h | ✅ |

Los límites se guardan en la tabla `ai_rate_limits` y se verifican via la función SQL `check_ai_rate_limit`. Los admins no tienen ningún límite.

### Datos que la IA usa para generar

La IA recibe el perfil completo de la empresa desde `company_profiles`:
- Nombre de empresa, industria, descripción, servicios
- Ciudad y estado
- Código NAICS primario (para expansión y documentos posteriores)

---

## 8. Video Cápsulas

Cada fase tiene **4 videos** de formación (16 en total). Los videos están en Instagram y se abren en un modal dentro del dashboard.

### Estructura

- **Tabla:** `video_capsules` — cada fila tiene `id` (ej: `day1-cap1`), `day_number`, `title`, `youtube_url`, `points_reward`, `sort_order`
- **Tabla de completions:** `video_capsule_completions` — registra qué usuario vio qué video

### Cómo funciona

1. Usuario ve el widget de videos en `/dashboard/dia-N`
2. Hace clic en un video → se abre modal con el embed de Instagram
3. Al abrir el modal → llama a `/api/xp/watch-capsule` → `+10 XP` (una sola vez por video)
4. El video queda marcado con un badge "✓ Completado"
5. Cooldown de 5 minutos entre videos distintos (para evitar abuso de multi-click)

### Estado actual

Los 16 videos tienen sus **títulos** cargados en la base de datos pero las **URLs de Instagram están pendientes**. Hay que actualizar el campo `youtube_url` en la tabla `video_capsules` para cada uno.

---

## 9. Llamada en Vivo

Cada fase tiene un botón "Unirme a la llamada en vivo" que:
1. Abre la URL de la llamada en una nueva pestaña
2. Registra la asistencia en la base de datos (`user_events` con tipo `call_join_day_N`)
3. Otorga **+30 XP** una sola vez por fase

### Estado actual

Todas las llamadas apuntan a `https://youtube.com/@govbidder` como URL por defecto. Hay que actualizar con las URLs reales de cada llamada (Zoom, Google Meet, YouTube Live).

---

## 10. Leaderboard

El leaderboard muestra el ranking de todos los participantes en tiempo real.

### Características

- **Actualización:** Polling automático cada 60 segundos
- **Privacidad:** Los nombres están enmascarados — solo se muestra la primera letra y las últimas 2 letras del primer nombre (ej: `J**n`). El usuario actual ve su propio nombre completo.
- **Visible en:** Panel principal del dashboard (barra lateral derecha)
- **Implementación:** Función SQL `get_leaderboard()` con SECURITY DEFINER (accesible por todos, pero los datos están anonimizados)
- **Elegibilidad para sorteo:** El panel de admin muestra si cada usuario es elegible (tiene el 100% del challenge completado)

---

## 11. Tutorial de Onboarding

Al ingresar por primera vez, los usuarios ven un tutorial de 5 pasos con spotlight interactivo.

### Pasos del tutorial

| Paso | Elemento resaltado | Descripción |
|------|-------------------|-------------|
| 1 | Barra de progreso | Explica el sistema de XP y niveles |
| 2 | Pill de puntos | Explica cómo ganar puntos |
| 3 | Tarjeta del Día 1 | Explica las fases del challenge |
| 4 | Videos (navega a Día 1) | Explica las cápsulas de video |
| 5 | Leaderboard | Explica el ranking |

### Persistencia

- El step actual se guarda en `localStorage` (`govbidder_tour_step_v1`) para sobrevivir la navegación entre páginas
- Al completar, se guarda `has_seen_onboarding = true` en la base de datos
- Los admins pueden resetear el tutorial de cualquier usuario desde el panel de admin
- Los usuarios pueden resetear su propio tutorial con el botón "Resetear tutorial" (solo visible para admins)

---

## 12. Panel de Administración

Accesible en `/admin` solo para usuarios con `is_admin = true` en la tabla `users`.

### Qué puede hacer el admin

#### Control de fases

| Acción | Descripción |
|--------|-------------|
| Desbloquear Día N | Activa la fase para TODOS los usuarios (toggle global) |
| Bloquear Día N | Vuelve a bloquear la fase para todos |

El toggle es **global** — cuando se activa el Día 2, todos los usuarios que tengan el Día 1 completado pueden acceder al Día 2.

#### Gestión de usuarios

La tabla de usuarios muestra para cada participante:

- **Nombre** y email
- **Puntos totales**
- **Estado por día** (D1, D2, D3, D4) — Bloqueado / Desbloqueado / Completado
- **Elegible sorteo** — si completó el 100% del challenge
- **Override** — botones para forzar completar o descompletar cada día individualmente
- **Reset** — botón para resetear completamente al usuario (elimina todo su progreso)

#### Override de completado

Cuando el admin fuerza la **descompleción** de un día:
1. Se elimina el registro de `day_progress`
2. Se eliminan los puntos correspondientes: start-day (-25), complete-day (-50), videos (-10 cada uno), join-call (-30 si aplicable)
3. Se actualiza `total_points` en la tabla `users` de forma atómica
4. El usuario vuelve al estado de "no completado" sin puntos de esa fase

#### Reset completo de usuario

Elimina TODO el progreso de un usuario específico:
- Borra todos los registros de `day_progress`
- Borra todos los registros de `video_capsule_completions`
- Borra todos los registros de `user_events` (join-calls)
- Resetea `total_points = 0`, `has_seen_onboarding = false`, `heartbeat_count_today = 0`

#### Reset del admin (propio)

El admin puede resetear su propio progreso con el botón "Restablecer todo" visible en el header del dashboard (solo para admins). Este botón también limpia las claves de localStorage relacionadas con el progreso local.

---

## 13. Integración con Hotmart

### ¿Qué es Hotmart?

La plataforma de pago donde se vende el acceso al challenge. Cuando alguien compra, Hotmart envía un **webhook** al dashboard.

### Flujo de webhook

```
Usuario compra en Hotmart
         ↓
Hotmart envía POST a /api/webhooks/hotmart
         ↓
El sistema verifica la firma HMAC del webhook (seguridad)
         ↓
Extrae el email del comprador
         ↓
Crea el usuario en Supabase Auth (si no existe)
         ↓
Crea el registro en tabla users con access_expires_at = ahora + 7 días
         ↓
Envía magic link al email del comprador
         ↓
El comprador recibe email → hace clic → accede al dashboard
```

### Configuración necesaria

1. Registrar el URL del webhook en el panel de Hotmart:
   ```
   https://govbidder-challenge.vercel.app/api/webhooks/hotmart
   ```
2. Configurar la variable de entorno `HOTMART_WEBHOOK_SECRET` con el secreto del webhook de Hotmart
3. Verificar que el tiempo de acceso (actualmente 7 días) sea el correcto para el challenge

### Pendiente

- Definir la duración de acceso correcta (¿7 días? ¿14 días? ¿permanente?)
- Registrar el webhook en el panel de Hotmart
- Configurar `HOTMART_WEBHOOK_SECRET` en Vercel

---

## 14. Base de datos — Tablas

### `users`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | uuid | ID del usuario (igual que el auth.users.id) |
| `full_name` | text | Nombre completo |
| `email` | text | Email |
| `total_points` | int | Puntos XP totales |
| `is_admin` | bool | Si es administrador |
| `access_expires_at` | timestamptz | Fecha de expiración del acceso |
| `has_seen_onboarding` | bool | Si ya vio el tutorial |
| `last_time_xp_at` | timestamptz | Último heartbeat XP |
| `last_avatar_xp_at` | timestamptz | Último click en avatar |
| `heartbeat_count_today` | int | Pulsos de heartbeat del día actual |
| `heartbeat_count_day` | date | Fecha del conteo de heartbeat |

### `day_progress`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `user_id` | uuid | FK → users.id |
| `day_number` | int | 1, 2, 3 o 4 |
| `is_unlocked` | bool | Si el usuario desbloqueó esta fase |
| `is_completed` | bool | Si completó la fase |
| `completed_at` | timestamptz | Cuándo la completó |

Clave única: `(user_id, day_number)`

### `company_profiles`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `user_id` | uuid | FK → users.id |
| `company_name` | text | Nombre de la empresa |
| `industry` | text | Industria |
| `description` | text | Descripción del negocio |
| `services` | text | Servicios que ofrece |
| `city` | text | Ciudad |
| `state` | text | Estado |
| `primary_naics` | text | Código NAICS principal |
| `niche` | text | Nicho federal identificado |

### `video_capsules`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | text | ID único (ej: `day1-cap1`) |
| `day_number` | int | A qué fase pertenece |
| `title` | text | Título del video |
| `youtube_url` | text | URL del video en YouTube |
| `points_reward` | int | Puntos por ver (10) |
| `sort_order` | int | Orden de aparición |

### `video_capsule_completions`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `user_id` | uuid | FK → users.id |
| `capsule_id` | text | FK → video_capsules.id |
| `points_earned` | int | Puntos otorgados |
| `completed_at` | timestamptz | Cuándo vio el video |

### `user_events`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `user_id` | uuid | FK → users.id |
| `event_type` | text | Tipo de evento (ej: `call_join_day_1`) |
| `created_at` | timestamptz | Cuándo ocurrió |

Clave primaria: `(user_id, event_type)` — garantiza idempotencia

### `admin_day_toggles`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `day_number` | int | 1, 2, 3 o 4 |
| `is_globally_unlocked` | bool | Si el día está activo para todos |

### `naics_expansions`

Guarda los códigos NAICS expandidos por IA del Día 2.

### `web_previews`

Guarda el preview de la web generado por IA del Día 3.

### `capability_statements`

Guarda el Capability Statement generado por IA del Día 4.

### `ai_rate_limits`

Guarda el conteo de llamadas a la IA por usuario y endpoint para aplicar los rate limits.

### Función SQL: `get_leaderboard()`

Función con `SECURITY DEFINER` que retorna el ranking con nombres enmascarados. Se llama vía `supabase.rpc("get_leaderboard")`.

### Función SQL: `check_ai_rate_limit()`

Función que verifica y registra las llamadas a la IA. Retorna `{ allowed, current_count, limit }` o `{ allowed: false, retry_after_seconds }`.

### Función SQL: `admin_uncomplete_day(p_user_id, p_day)`

Función con `SECURITY DEFINER` que calcula y descuenta todos los puntos de una fase cuando el admin la desmarca. Retorna el desglose de puntos eliminados.

---

## 15. Variables de entorno

Configurar en Vercel (Settings → Environment Variables):

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[proyecto].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...    (clave anónima, segura para el cliente)
SUPABASE_SERVICE_ROLE_KEY=eyJ...        (⚠️ SECRETO — solo en servidor)

# App
NEXT_PUBLIC_APP_URL=https://govbidder-challenge.vercel.app

# IA
ANTHROPIC_API_KEY=sk-ant-...            (⚠️ SECRETO — solo en servidor)

# Hotmart (pendiente de configurar)
HOTMART_WEBHOOK_SECRET=...              (⚠️ SECRETO — pendiente)
```

> **IMPORTANTE:** `SUPABASE_SERVICE_ROLE_KEY` y `ANTHROPIC_API_KEY` nunca deben exponerse al cliente. Solo deben usarse en rutas de API server-side.

---

## 16. Infraestructura y deploy

### Deploy automático

Cada vez que se hace `git push origin main`, Vercel detecta el cambio y despliega automáticamente en `https://govbidder-challenge.vercel.app`. El proceso tarda ~2 minutos.

### Repositorio

```
https://github.com/Juampii01/Dashboard-de-Lanzamiento
```

- Rama principal: `main`
- No hay otras ramas activas

### Supabase

- **Proyecto:** `fsawwhvdsqmxgxrpuwos`
- **URL:** `https://fsawwhvdsqmxgxrpuwos.supabase.co`
- **Dashboard:** `https://supabase.com/dashboard/project/fsawwhvdsqmxgxrpuwos`

Para modificar la base de datos (crear tablas, funciones, políticas RLS), usar el **SQL Editor** en el dashboard de Supabase.

---

## 17. Cómo operar durante el lanzamiento

### Pre-lanzamiento (checklist completo)

Ver sección [18. Pendientes antes del lanzamiento](#18-pendientes-antes-del-lanzamiento).

### Día 0 (antes del evento)

- [ ] Verificar que el webhook de Hotmart está registrado y funcionando
- [ ] Hacer una compra de prueba en Hotmart → verificar que llega el email de magic link
- [ ] Verificar que los videos del Día 1 tienen URLs correctas en la DB
- [ ] Asegurarse de que **solo el Día 1 está desbloqueado** en el panel admin

### Durante el challenge (días 1-4)

#### Cada día, antes de la sesión:

1. Ir a `https://govbidder-challenge.vercel.app/admin`
2. En la sección "Control de Días", hacer clic en "Desbloquear" para el día correspondiente
3. Verificar que el toggle quedó activo (verde)

#### Durante la llamada en vivo:

- La URL de la llamada debe estar configurada en el código antes de que empiece
- Cuando los participantes hacen clic en "Unirme a la llamada" → obtienen +30 XP automáticamente
- Los participantes ven en tiempo real cómo suben sus puntos en el leaderboard

#### Soporte durante el evento:

- Si un usuario tiene problemas de acceso → pedirle que vaya a `/login` y solicite un nuevo magic link
- Si un magic link expiró → el usuario lo ve en la pantalla y puede pedir otro
- Si hay problemas con puntos → el admin puede ajustar manualmente desde el panel

### Post-challenge

- Los accesos expiran automáticamente según `access_expires_at`
- El leaderboard sigue siendo visible durante el período de acceso
- Si se quiere premiar al ganador → usar el panel admin para ver quién es elegible para el sorteo

---

## 18. Pendientes antes del lanzamiento

### Críticos (el sistema no funciona sin esto)

| # | Tarea | Dónde configurar |
|---|-------|-----------------|
| 1 | **URLs de YouTube** para los 16 videos | SQL Editor de Supabase: `UPDATE video_capsules SET youtube_url = '...' WHERE id = 'day1-cap1'` |
| 2 | **URL de la llamada en vivo** para cada fase | Código: `app/dashboard/dia-N/client.tsx` → pasar prop `callUrl` al `JoinCallButton` |
| 3 | **Configurar webhook de Hotmart** | Panel de Hotmart → Webhooks → agregar URL del endpoint |
| 4 | **`HOTMART_WEBHOOK_SECRET`** | Vercel → Settings → Environment Variables |

### Importantes (afectan la experiencia)

| # | Tarea | Detalle |
|---|-------|---------|
| 5 | **Duración del acceso** | El webhook de Hotmart configura 7 días. ¿Es correcto? Modificar en `app/api/webhooks/hotmart/route.ts` |
| 6 | **Template del email** de magic link | Supabase Dashboard → Authentication → Email Templates |
| 7 | **Nombre del nivel "Rookie"** | Si se quiere renombrar a algo más del nicho. Cambiar en `components/progress-bar.tsx` |

### Seguridad (hacer antes de producción)

| # | Tarea | Urgencia |
|---|-------|---------|
| 8 | Rotar contraseña de Supabase DB | Alta — fue compartida en el chat de trabajo |
| 9 | Revocar token de acceso personal de Supabase | Alta — fue compartido en el chat de trabajo |

### Opcionales (mejoras futuras)

| # | Tarea | Detalle |
|---|-------|---------|
| 10 | **Automatizar desbloqueo de días** | Crear un cron job que desbloquee automáticamente según el calendario del challenge |
| 11 | **PDF del Día 3** | Actualmente solo hay preview HTML; el Día 3 no tiene PDF descargable |
| 12 | **Restringir leaderboard** a usuarios autenticados | SQL: `REVOKE EXECUTE ON FUNCTION get_leaderboard() FROM PUBLIC; GRANT EXECUTE ... TO authenticated` |

---

## 19. Seguridad y anti-cheat

### Rate limiting de IA

Todos los endpoints de IA tienen límites por usuario y globales. Los límites se guardan en la base de datos para que persistan entre sesiones y no se puedan evadir borrando cookies.

### Idempotencia de XP

- **Start-day y Complete-day:** Se usa `UPDATE WHERE is_completed = false RETURNING *` — si ya se completó, no se duplica el XP
- **Join-call:** Se usa `INSERT INTO user_events` con clave primaria `(user_id, event_type)` — el segundo INSERT falla con un error de duplicado que se maneja silenciosamente
- **Videos:** `UNIQUE (user_id, capsule_id)` en `video_capsule_completions`

### Control de acceso (RLS)

- La tabla `users` tiene políticas RLS que permiten a cada usuario solo leer/escribir sus propios datos
- Las rutas de API que usan `createClient()` respetan el usuario autenticado
- Las rutas de admin verifican `is_admin = true` antes de ejecutar cualquier acción privilegiada
- `createServiceClient()` (service role) solo se usa en Server Components que necesitan leer datos sin depender del usuario autenticado

### Verificación del webhook de Hotmart

El webhook verifica la firma HMAC del request para asegurar que proviene de Hotmart y no de un atacante externo.

---

*Documentación generada en Mayo 2026 · Govbidder Challenge Dashboard v1.0*
