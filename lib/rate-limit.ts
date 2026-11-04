/**
 * Rate-limit helper for AI endpoints.
 *
 * Uses createServiceClient() (service role) so that check_ai_rate_limit
 * runs with the correct privileges after the Día 2 REVOKE tightening.
 * This is always called from server-side API routes, never from the browser.
 */
import { createServiceClient } from '@/lib/supabase/server'

type RateLimitResult =
  | { allowed: true; current_count: number; limit: number }
  | { allowed: false; retry_after_seconds: number; current_count: number; limit: number }

export async function checkRateLimit(
  userId: string,
  endpoint: string,
  maxCalls: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  // createServiceClient() is synchronous — no await
  const supabase = createServiceClient()

  const { data, error } = await supabase.rpc('check_ai_rate_limit', {
    p_user_id: userId,
    p_endpoint: endpoint,
    p_max_calls: maxCalls,
    p_window_seconds: windowSeconds,
  })

  if (error) {
    console.error('Rate limit check failed:', error)
    return {
      allowed: false,
      retry_after_seconds: 60,
      current_count: 0,
      limit: maxCalls,
    }
  }

  return data as RateLimitResult
}

/**
 * Tope de IA para cuentas On Demand. El acceso es indefinido, así que además
 * de los límites diarios de cada ruta hay un tope cada 30 días por persona:
 *   - herramientas (NAICS, web, capability statement, copy): 120 usos
 *   - asistente: 400 mensajes
 * Los admins y las cuentas del en vivo no pasan por aquí.
 */
export const ONDEMAND_AI_WINDOW_SECONDS = 30 * 24 * 60 * 60

export async function checkOndemandAiCap(
  userId: string,
  kind: 'tools' | 'assistant'
): Promise<{ allowed: true } | { allowed: false; retry_after_seconds: number }> {
  const supabase = createServiceClient()
  const { data } = await supabase.from('users').select('program, is_admin').eq('id', userId).maybeSingle()
  const row = data as { program?: string; is_admin?: boolean } | null
  if (!row || row.is_admin || row.program !== 'ondemand') return { allowed: true }

  const rl = await checkRateLimit(
    userId,
    kind === 'assistant' ? 'od-assistant-30d' : 'od-ai-tools-30d',
    kind === 'assistant' ? 400 : 120,
    ONDEMAND_AI_WINDOW_SECONDS
  )
  return rl.allowed ? { allowed: true } : { allowed: false, retry_after_seconds: rl.retry_after_seconds }
}
