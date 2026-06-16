@AGENTS.md

# Govbidder Challenge Dashboard — Guía para Claude

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js **16.2.6** App Router + Turbopack |
| UI | React **19.2.4** (server + client components) |
| Estilos | Tailwind CSS v4 (sin `tailwind.config.js` — config en CSS) |
| DB / Auth | Supabase (PostgreSQL + Auth + Storage) |
| ORM | Supabase JS Client v2 (`@supabase/ssr ^0.10.3`) |
| Deploy | Vercel → `https://dboard.govbidder.net` |
| Repo | `https://github.com/Juampii01/Dashboard-de-Lanzamiento` (rama `main`) |

## Estructura de carpetas clave

```
app/
  dashboard/
    layout.tsx          ← Layout compartido de TODAS las páginas /dashboard/*
    page.tsx            ← Dashboard principal (grid de 4 días + leaderboard)
    dia-1/ … dia-4/     ← Cada fase del challenge (page.tsx + client.tsx)
  api/
    xp/
      heartbeat/        ← +5 pts cada 10 min
      avatar/           ← +3 pts click en avatar, cooldown 60 min
      watch-capsule/    ← +10 pts por video, cooldown 5 min
      complete-day/     ← +25 pts al completar fase, idempotente
    capsules/           ← GET ?day=N → lista de videos + estado completado
    leaderboard/        ← GET → RPC get_leaderboard()
    onboarding/
      complete/         ← POST → has_seen_onboarding = true
      reset/            ← POST → has_seen_onboarding = false (solo admins)
    ai/                 ← Rutas de generación con Claude API
    dev/                ← Utilidades solo para modo dev (complete, reset)
components/
  xp-engine.tsx         ← Heartbeat invisible + listener xp-avatar-click
  points-hud.tsx        ← Pill de puntos, tooltip fixed, listener xp-gained
  progress-bar.tsx      ← Barra de vida estilo arcade con avatar de Santo
  video-capsules.tsx    ← Widget de videos por día, cooldown badge, modal YouTube
  leaderboard.tsx       ← Tabla de líderes, polling 60s, nombre enmascarado
  onboarding-tutorial.tsx ← Tutorial multi-página con spotlight CSS
  reset-tutorial-button.tsx ← Botón admin para reiniciar el tutorial
  dev-test-bar.tsx      ← Barra de dev para marcar días completos en localhost
lib/
  supabase/
    server.ts           ← createClient() (anon+session) y createServiceClient() (service role)
    client.ts           ← createClient() para componentes cliente
    helpers.ts          ← getAdminToggle(), getAllAdminToggles()
  wow-effects.ts        ← flyPoints(), createParticleBurst(), triggerFlash(), etc.
  utils.ts              ← cn(), daysLeft(), isExpired(), progressPercent()
```

## Patrones críticos

### Dev mode vs producción

```ts
// PATRÓN CORRECTO — usado en layout.tsx y todas las páginas:
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const DEV_MODE = !(SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("placeholder"));

// ❌ INCORRECTO — NO usar esto (causa inconsistencias):
const DEV_MODE = process.env.NEXT_PUBLIC_APP_URL?.includes("localhost");
```

En `devMode = true`: se usa `DEV_PROFILE` hardcodeado, cookies para progreso, no se montan XpEngine ni OnboardingTutorial.

### Clientes Supabase — cuándo usar cada uno

```ts
// createClient() → usa session del usuario → respeta RLS
// Usar en: rutas de API (auth check + lecturas/escrituras del usuario)
const supabase = await createClient();

// createServiceClient() → clave de servicio → bypasea RLS
// Usar en: Server Components del layout y página (para leer datos del usuario sin
// depender de políticas RLS que pueden no estar configuradas)
const supabase = createServiceClient(); // NO es async
```

**Regla**: `getLayoutData()` y `getDashboardData()` en Server Components usan `createServiceClient()`. Las rutas `/api/xp/*` usan `createClient()` con auth check del usuario.

### Sistema XP — flujo completo

1. **Fuente de XP** (API route) → actualiza `users.total_points` en Supabase
2. **API route** → retorna `{ ok, delta, total }`
3. **Cliente** (XpEngine / VideoCapulas / DevTestBar) → dispara Custom Event:
   ```ts
   window.dispatchEvent(new CustomEvent("xp-gained", {
     detail: { delta: N, total: T, source: "time" | "avatar" | "video" | "day" }
   }));
   ```
4. **PointsHUD** escucha `xp-gained` → actualiza estado local, muestra flyPoints y flip animation

### Custom Events del sistema

| Evento | Despachado por | Escuchado por |
|--------|---------------|---------------|
| `xp-gained` | XpEngine, VideoCapsules, DevTestBar | PointsHUD, Leaderboard |
| `xp-avatar-click` | SantoAvatar (progress-bar) | XpEngine |
| `day-unlocked` | UnlockEventListener | — |

### Animaciones — NO usar Framer Motion

Todas las animaciones usan Web Animations API o CSS keyframes definidos en `app/globals.css`:
- `bar-bounce` — bounce continuo del avatar de Santo
- `bar-avatar-jump` — salto al hacer click
- `bar-light-sweep` — sweep de luz en la barra de progreso
- `low-health-flicker` — parpadeo rojo cuando progreso = 0%
- `pts-pill-flip` — flip 3D del pill de puntos
- `pts-detail-show` — animación de entrada del tooltip

### data-tour-id — elementos del tutorial

| `data-tour-id` | Elemento | Página |
|---|---|---|
| `progress-bar` | Barra de progreso | `/dashboard` (layout) |
| `xp-pill` | Pill de puntos HUD | `/dashboard` (layout) |
| `day-card-1` | Tarjeta del Día 1 | `/dashboard` |
| `day-cards` | Grid de 4 días (sin uso activo) | `/dashboard` |
| `capsules` | Sección Misiones en Video | `/dashboard/dia-*` |
| `leaderboard` | Tabla de líderes | `/dashboard` |

### Tutorial multi-página

El tutorial persiste el step en `localStorage` (`govbidder_tour_step_v1`) para sobrevivir navegación entre páginas. El paso 4 (videos) navega al usuario a `/dashboard/dia-1` donde `data-tour-id="capsules"` sí existe. Al completar, limpia ambas claves de localStorage.

## Tablas Supabase relevantes

| Tabla | Columnas clave |
|-------|---------------|
| `users` | `id, full_name, total_points, is_admin, access_expires_at, has_seen_onboarding, last_time_xp_at, last_avatar_xp_at` |
| `day_progress` | `user_id, day_number, is_unlocked, is_completed, completed_at` — UNIQUE(user_id, day_number) |
| `company_profiles` | `user_id, primary_naics, niche, ...` |
| `video_capsules` | `id, day_number, title, youtube_url, points_reward, sort_order` |
| `video_capsule_completions` | `user_id, capsule_id, points_earned, completed_at` — UNIQUE(user_id, capsule_id) |
| `naics_expansions` | `user_id, keywords_expanded` |
| `admin_toggles` | `day_number, is_globally_unlocked` |

**RPC**: `get_leaderboard()` — SECURITY DEFINER, devuelve ranking con nombres enmascarados.

## Variables de entorno

```
NEXT_PUBLIC_SUPABASE_URL=https://....supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=https://dboard.govbidder.net
ANTHROPIC_API_KEY=sk-ant-...
```

## Convenciones de código

- **Server Components** por defecto. Agregar `"use client"` solo cuando necesario.
- **No usar `await`** con `createServiceClient()` — es síncrona.
- **Siempre `maybeSingle()`** en lugar de `single()` cuando la fila puede no existir.
- **`upsert` con `onConflict`** explícito: `{ onConflict: "user_id,day_number" }`.
- **Estilos inline** para todo lo que no sea layout/spacing básico (Tailwind solo para flex, grid, positioning).
- **Sin `pointer-events-none`** en wrappers de elementos interactivos.
- **Z-index del tutorial**: overlay `99980`, spotlight `99981`, card `99990`. Tooltip del HUD: `99999` (fixed position).

## Comandos útiles

```bash
npm run dev          # Servidor local en localhost:3000
npm run build        # Build de producción
npx tsc --noEmit     # Type check (ignorar error react-pdf, es pre-existente)
git push origin main # Dispara deploy automático en Vercel
```
