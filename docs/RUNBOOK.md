# Govbidder Dashboard — Runbook Operativo

> Última actualización: 2026-05-30 | Responsable: Juan Pablo Acosta

---

## Checklist Pre-Lanzamiento (Día 7)

Completar en orden **antes del primer evento**:

- [ ] **1. Videos cargados** — Las 8 `youtube_url` en `video_capsules` tienen URL real (no vacías)
- [ ] **2. Quizzes reales** — Las 8 preguntas en `video_quizzes` NO tienen el texto `[DUMMY — REEMPLAZAR]`
- [ ] **3. NEXT_PUBLIC_CALL_URL** — Env var en Vercel Dashboard apunta a la transmisión del Día 1
- [ ] **4. admin_day_toggles** — Solo Día 1 = `true`, Días 2/3/4 = `false`
  ```sql
  SELECT day_number, is_globally_unlocked FROM admin_day_toggles ORDER BY day_number;
  ```
- [ ] **5. Rotación de service role key** — Generar nueva key en Supabase → actualizar en Vercel → verificar deploy OK
- [ ] **6. Smoke test compra** — Hacer una compra real de prueba en Hotmart sandbox:
  - Vercel log: debe aparecer webhook `PURCHASE_APPROVED`
  - Supabase Auth: usuario creado con `hotmart_transaction_id` poblado
  - Email: magic link recibido y funcional
- [ ] **7. Smoke test dashboard** — Con la cuenta del smoke test:
  - Login con magic link ✓
  - Tutorial completo ✓
  - Día 1 desbloqueado ✓
  - Video 1 visible, quiz aparece después de marcar ✓
  - XP suma en leaderboard ✓

---

## Operación Durante Cada Evento en Vivo

### 30 minutos antes del evento
1. Ir a Vercel Dashboard → Environment Variables → actualizar `NEXT_PUBLIC_CALL_URL` con el stream del día
2. Hacer redeploy del proyecto si la var era la misma (Vercel a veces cachea)
3. Verificar que el botón "Unirse al Evento" en el dashboard apunta a la URL correcta

### 10 minutos antes del evento
1. Ir a `/admin` → sección de días → activar el día correspondiente
2. Confirmar que los asistentes ven el día desbloqueado (puede tardar 30-60s en propagar)

### Durante el evento
- Monitorear `/admin` → ver quién está activo, progreso en tiempo real
- Si hay problema con el stream: actualizar `NEXT_PUBLIC_CALL_URL` → redeploy → avisar por WhatsApp

### Post-evento
- Opcional: bloquear el día para no confundir a rezagados (según estrategia del equipo)

---

## Flujos de Soporte

### Comprador no recibe el magic link de bienvenida

1. Verificar en Vercel → Functions → buscar logs de `/api/webhooks/hotmart` con ese email
2. Si el webhook NO llegó: verificar configuración en Hotmart → URL del webhook correcta?
3. Si el webhook SÍ llegó pero hay error: revisar logs detallados
4. Si el usuario existe en Supabase Auth pero no recibió el email:
   ```sql
   -- Verificar que tiene hotmart_transaction_id y acceso vigente
   SELECT email, hotmart_transaction_id, access_expires_at FROM users WHERE email = 'email@ejemplo.com';
   ```
5. Enviar nuevo magic link manualmente:
   ```
   Supabase Dashboard → Authentication → Users → [usuario] → Send magic link
   ```

### Usuario existe en Auth pero no tiene acceso al dashboard (redirige a /sin-acceso)

Causa: `hotmart_transaction_id` es NULL → webhook no llegó o falló.

```sql
-- Verificar estado
SELECT id, email, hotmart_transaction_id, access_expires_at FROM users WHERE email = 'email@ejemplo.com';

-- Si la compra fue legítima y hay transaction_id de Hotmart disponible:
UPDATE users SET 
  hotmart_transaction_id = 'HOTMART-TX-XXXXXX',
  access_starts_at = now(),
  access_expires_at = now() + interval '7 days'
WHERE email = 'email@ejemplo.com';

-- También asegurar que Día 1 esté desbloqueado
UPDATE day_progress SET is_unlocked = true 
WHERE user_id = (SELECT id FROM users WHERE email = 'email@ejemplo.com')
  AND day_number = 1;
```

### Usuario perdió progreso / XP incorrecto

```sql
-- Ver estado completo del usuario
SELECT u.email, u.total_points, dp.day_number, dp.is_unlocked, dp.is_completed
FROM users u
JOIN day_progress dp ON dp.user_id = u.id
WHERE u.email = 'email@ejemplo.com'
ORDER BY dp.day_number;

-- Ver todos los attempts de quiz
SELECT vq.capsule_id, vqa.is_correct, vqa.xp_awarded, vqa.attempted_at
FROM video_quiz_attempts vqa
JOIN video_quizzes vq ON vq.id = vqa.quiz_id
WHERE vqa.user_id = (SELECT id FROM users WHERE email = 'email@ejemplo.com')
ORDER BY vqa.attempted_at DESC;

-- Ajustar puntos manualmente si hay drift
UPDATE users SET total_points = <correcto> WHERE email = 'email@ejemplo.com';
```

### Día no se desbloquea para los usuarios

1. Verificar `admin_day_toggles`:
   ```sql
   SELECT * FROM admin_day_toggles ORDER BY day_number;
   ```
2. Si `is_globally_unlocked = false`, ir a `/admin` → activar el día
3. Si ya está `true` pero los usuarios no lo ven: verificar RLS / política de unlock en el código

### XP duplicado o inconsistente

Los XP son atómicos vía RPC `add_points()`. Si hay drift:
```sql
-- Recalcular XP esperado vs real
SELECT 
  u.email,
  u.total_points AS stored_pts,
  (
    -- XP de quizzes
    (SELECT COALESCE(SUM(xp_awarded), 0) FROM video_quiz_attempts WHERE user_id = u.id AND is_correct = true) +
    -- XP de videos
    (SELECT COALESCE(SUM(vc.points_reward), 0) FROM video_capsule_completions vcc
     JOIN video_capsules vc ON vc.id = vcc.capsule_id WHERE vcc.user_id = u.id) +
    -- XP de días completados  
    (SELECT count(*) * 25 FROM day_progress WHERE user_id = u.id AND is_completed = true) +
    -- XP de start-day
    (SELECT count(*) * 5 FROM day_progress WHERE user_id = u.id AND is_unlocked = true)
    -- Nota: heartbeat y avatar XP no son recalculables individualmente
  ) AS calculated_floor
FROM users u
WHERE u.email = 'email@ejemplo.com';
```

---

## Monitoreo

### Vercel Logs
- **Durante eventos**: revisar logs en tiempo real → Vercel Dashboard → Functions → `/api/webhooks/hotmart`, `/api/xp/*`
- **5xx errors**: cualquier error 500+ requiere investigación inmediata
- **Alertas**: configurar email alert en Vercel para 5xx rate > 1%

### Supabase
- **Slow queries**: Supabase Dashboard → Performance → Slow Queries
- **DB size**: vigilar si crece inesperadamente rápido (posible spam de heartbeats)
- **Auth**: revisar usuarios creados por día para detectar creación masiva indeseada

### Métricas a revisar post-evento
```sql
-- Usuarios activos (enviaron heartbeat en últimas 24h)
SELECT count(*) FROM users WHERE last_time_xp_at > now() - interval '24 hours';

-- Distribución de XP
SELECT 
  CASE WHEN total_points = 0 THEN '0 pts'
       WHEN total_points < 50 THEN '1-49 pts'
       WHEN total_points < 150 THEN '50-149 pts'
       ELSE '150+ pts' END AS rango,
  count(*) AS usuarios
FROM users
GROUP BY 1 ORDER BY min(total_points);

-- Completion rate por día
SELECT day_number, count(*) FILTER (WHERE is_completed) AS completados, count(*) AS total
FROM day_progress
GROUP BY day_number ORDER BY day_number;
```

---

## Comandos de Emergencia

```bash
# Rollback de última migration (si algo sale mal en go-live)
psql $DATABASE_URL -c "DROP TABLE IF EXISTS video_quiz_attempts, video_quizzes CASCADE;"

# Forzar unlock de todos los usuarios para Día 1
psql $DATABASE_URL -c "UPDATE day_progress SET is_unlocked = true WHERE day_number = 1;"

# Ver últimas 20 ejecuciones de funciones en Vercel
# → Vercel Dashboard → [proyecto] → Functions → Filters: last 1h
```

---

## Rotación de Claves (Día 7 — go-live)

1. **Supabase service role key**:
   - Supabase Dashboard → Settings → API → Regenerate service_role key
   - Actualizar en Vercel: `SUPABASE_SERVICE_ROLE_KEY` → redeploy
   - Verificar `/api/webhooks/hotmart` sigue funcionando (POST de prueba)

2. **Hotmart webhook secret**:
   - Hotmart Dashboard → Integración → Webhooks → Cambiar secret
   - Actualizar `HOTMART_WEBHOOK_SECRET` en Vercel → redeploy

3. **Anthropic API key** (si se compartió con alguien durante desarrollo):
   - console.anthropic.com → API Keys → Revocar la de dev → Crear nueva
   - Actualizar `ANTHROPIC_API_KEY` en Vercel → redeploy
