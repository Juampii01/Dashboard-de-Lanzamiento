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
