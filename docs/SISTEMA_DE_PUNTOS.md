# Sistema de Puntos (XP) — Govbidder Challenge Dashboard

> Documento de referencia del motor de gamificación: cómo se ganan puntos, las 4 fases
> (un día cada una) conectadas al Dashboard, las 8 misiones de video (2 por día) y el
> **techo de puntos** que puede alcanzar alguien que trabaje de forma excelente.
>
> **Todos los valores de este documento provienen del código fuente** (rutas `app/api/xp/*`
> y migraciones `supabase/migrations/*`), que es la fuente autoritativa. Donde el `CLAUDE.md`
> difiere, se indica explícitamente.

---

## 1. Cómo funciona el motor de puntos

`users.total_points` es el único contador de XP del usuario. **Solo se modifica** a través de
la RPC atómica `add_points(p_user_id, p_delta)` o dentro de `award_heartbeat_xp`
(`supabase/migrations/20260528000002_atomic_xp_rpcs.sql`). Esto garantiza que cada suma sea
atómica (con `FOR UPDATE`) y que no haya condiciones de carrera.

El flujo de una ganancia de XP es siempre el mismo:

1. **Fuente de XP** (una ruta de API) valida la acción + cooldown/idempotencia → llama a `add_points`.
2. La ruta responde `{ ok, delta, total }`.
3. El cliente despacha el Custom Event `xp-gained` con `{ delta, total, source }`.
4. `PointsHUD` escucha el evento, actualiza el pill de puntos y lanza la animación `flyPoints`.

### Reglas que evitan inflar puntos

- **Cooldowns**: tiempo mínimo entre acciones repetibles (heartbeat, avatar, video).
- **Cap diario**: el heartbeat tiene tope de 30 por día (reset a medianoche UTC).
- **Idempotencia**: las acciones de "una sola vez" (completar día, video visto, podcast, quiz,
  unirse a la llamada) usan restricciones `UNIQUE` o updates condicionales, así que **no pagan dos veces**.

---

## 2. Catálogo completo de fuentes de puntos

| Fuente | Puntos | Límite / Cooldown | Idempotente | Ruta / Archivo |
|---|---|---|---|---|
| **Tiempo activo** (heartbeat) | **+5** | cada 10 min · **máx 30/día (=150 pts/día)** | cap diario | `app/api/xp/heartbeat` → RPC `award_heartbeat_xp` |
| **Click en avatar** (Santo) | **+3** | cada 60 min | sello `last_avatar_xp_at` | `app/api/xp/avatar` |
| **Ver cápsula de video** | **+10** *(default `points_reward`)* | cooldown global 5 min | `UNIQUE(user_id, capsule_id)` | `app/api/xp/watch-capsule` |
| **Podcast completo** | **+30** | 1 vez por cápsula-podcast | `UNIQUE` en `podcast_xp_claims` | `app/api/xp/claim-podcast` |
| **Quiz correcto** | **+10** *(default `xp_reward`)* | 1 vez por quiz, solo si acierta | índice único en intentos correctos | `app/api/quiz/submit` |
| **Iniciar día** (start-day) | **+25** | 1 vez por día | `INSERT` en `day_progress` | `app/api/xp/start-day` |
| **Completar día** (complete-day) | **+50** | 1 vez por día | UPDATE atómico `is_completed=false` | `app/api/xp/complete-day` |
| **Unirse a la llamada del día** | **+30** | 1 vez por día | evento único en `user_events` | `app/api/xp/join-call` |
| **Llamada en vivo** (live-call-join) | **+30** | 1 vez por `callId` | evento único en `user_events` | `app/api/xp/live-call-join` |

> ⚠️ **Nota de inconsistencia con `CLAUDE.md`**: la doc dice que completar un día da **+25**;
> el código real otorga **+50** (`POINTS_PER_DAY = 50`). Además, `start-day` (+25),
> `join-call` (+30), `claim-podcast` (+30) y `quiz` (+10) **no están documentados en `CLAUDE.md`**
> pero sí existen y están cableados en la UI. El "combo bar" fue **eliminado** (es un stub que
> retorna `null`); aunque las RPCs `add_combo_progress`/`claim_combo` siguen en la DB, **no
> tienen ningún llamador** → no es una fuente de puntos activa.

### Detalle técnico del heartbeat (tiempo en plataforma)

- El componente `components/xp-engine.tsx` envía un ping cada **10 min** (`HEARTBEAT_MS`).
- **Anti-idle**: si el usuario lleva **≥ 5 min sin actividad** (mouse, teclado, scroll, click)
  el ping **no se envía** → no se acumula XP "dejando la pestaña abierta".
- Para llegar al cap de 30 heartbeats hay que estar **activo ~5 horas** en el día (30 × 10 min).

---

## 3. Las 4 fases (un día cada una) conectadas al Dashboard

El Dashboard principal (`/dashboard`) muestra un grid de **4 tarjetas de día** + el leaderboard +
la barra de progreso (avatar de Santo) + el pill de puntos. Cada tarjeta enlaza a su fase
(`/dashboard/dia-1` … `/dashboard/dia-4`). Al entrar se otorga **+25 (start-day)** y al terminar
la tarea principal de la fase se otorga **+50 (complete-day)**.

| Día | Fase | Qué hace el usuario | XP propio de la fase |
|---|---|---|---|
| **Día 1** | **Perfil Estratégico** | Construye el perfil de empresa y genera su código NAICS principal. | start (+25) + complete (+50) |
| **Día 2** | **Mapa de Códigos** | Expande el NAICS a NAICS/PSC/SIC/UNSPSC/NIGP + keywords (IA). | start (+25) + complete (+50) |
| **Día 3** | **Web + Portales** | Genera una landing page con IA y accede a los portales. | start (+25) + complete (+50) |
| **Día 4** | **Capability Statement + Cierre** | Genera el Capability Statement y cierra el programa. | start (+25) + complete (+50) |

> Las rutas `/api/ai/*` (expandir códigos, generar web, generar capability statement) **generan
> contenido pero no otorgan XP directamente**. El XP de cada fase viene de start-day, complete-day,
> las 2 misiones de video, el quiz y la llamada del día.

---

## 4. Las 8 misiones de video (2 por día)

Hay exactamente **8 cápsulas de video = 2 por día** (garantizado por la migración
`20260530000000_reduce_to_two_videos_per_day.sql`, que verifica `count = 8` y máx 2 por día).

Por convención de `sort_order`:

| `sort_order` | Tipo de misión | Cómo se reclama | XP |
|---|---|---|---|
| **1** | **Podcast** | botón "escuché el podcast" → `claim-podcast` | **+30** |
| **2** | **Video normal** | ver el video → `watch-capsule` | **+10** *(default)* |

Además, los videos pueden tener un **quiz** asociado (`video_quizzes`) que paga **+10** al responder
correctamente (una sola vez por quiz).

> Los valores reales de `points_reward` de cada cápsula y `xp_reward` de cada quiz se administran
> desde el panel `app/admin/contenido`. Si no se cambian, usan los **defaults: 10 y 10**.

**XP por día solo de las 2 misiones (+ quiz):**
`+30 (podcast) + 10 (video) + 10 (quiz) = +50 por día` → **+200 en los 4 días**.

---

## 5. ¿Cuántos puntos puede sumar alguien que trabaje de forma EXCELENTE?

Separamos los puntos en **garantizados** (cualquiera que complete todo los obtiene) y
**variables por tiempo** (dependen de cuántas horas esté activo).

### A) Puntos garantizados por completar TODO cada día

| Fuente | XP/día | × 4 días |
|---|---|---|
| Iniciar día (start-day) | +25 | +100 |
| Misión 1 — Podcast (claim-podcast) | +30 | +120 |
| Misión 2 — Video (watch-capsule) | +10 | +40 |
| Quiz del video | +10 | +40 |
| Unirse a la llamada del día (join-call) | +30 | +120 |
| Completar día (complete-day) | +50 | +200 |
| **Subtotal garantizado** | **+155/día** | **+620** |

### B) Puntos variables por tiempo activo (durante los 4 días)

| Fuente | Supuesto "excelente" | XP/día | × 4 días |
|---|---|---|---|
| Tiempo activo (heartbeat) | tope diario de 30 pings (~5 h activo) | +150 | +600 |
| Click en avatar | 1 click/hora durante ~5 h | ~+15 | ~+60 |
| **Subtotal variable** | | **~+165/día** | **~+660** |

### C) Totales

| Escenario | Cálculo | Total en 4 días |
|---|---|---|
| **Excelente realista** (completa todo + ~2 h activo/día) | 620 + (≈60/día heartbeat × 4) + avatar | **≈ 900 – 950 pts** |
| **Excelente máximo (techo teórico)** | 620 garantizado + 600 heartbeat + 60 avatar | **≈ 1.280 pts** |

> **Extra opcional**: si además hay sesiones de **llamada en vivo** (`live-call-join`, +30 cada una,
> una por `callId`), cada participación suma +30 sobre los totales anteriores.

### Resumen ejecutivo

- **Piso de excelencia** (hace las 8 misiones, los 4 quizzes, inicia y completa los 4 días y
  se une a las 4 llamadas): **620 puntos garantizados**.
- **Con tiempo activo y clicks de avatar** sumando la parte variable, un usuario excelente
  realista llega a **~900 puntos**, y el **techo teórico** ronda los **~1.280 puntos** en el
  challenge completo de 4 días (sin contar llamadas en vivo extra).

---

## 6. Referencias de código

- Rutas de XP: `app/api/xp/{heartbeat,avatar,watch-capsule,claim-podcast,start-day,complete-day,join-call,live-call-join}/route.ts`
- Quiz: `app/api/quiz/submit/route.ts`
- Motor cliente: `components/xp-engine.tsx`, `components/points-hud.tsx`, `components/progress-bar.tsx`, `components/video-capsules.tsx`
- RPCs atómicas: `supabase/migrations/20260528000002_atomic_xp_rpcs.sql`
- Esquema y seeds: `supabase/migrations/20260527000000_baseline_schema.sql`,
  `20260530000000_reduce_to_two_videos_per_day.sql`,
  `20260602000000_video_content_structure.sql`,
  `20260530000001_video_quizzes.sql`, `20260603000002_quiz_xp_10pts.sql`
