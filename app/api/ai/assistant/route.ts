import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callClaudeChat, sanitizeInput, type ChatMessage } from "@/lib/claude";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  ASSISTANT_SYSTEM_PROMPT,
  getUserProgressSummary,
  summaryToPromptText,
} from "@/lib/assistant";
import { z } from "zod";

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(2000),
      })
    )
    .min(1)
    .max(20),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit (admins bypasean). Límite propio del asistente, separado del
  // ai-global-daily de los generadores para no bloquearlos entre sí.
  const { data: profile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!(profile as { is_admin?: boolean } | null)?.is_admin) {
    const rl = await checkRateLimit(user.id, "assistant", 10, 60);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: "rate_limited",
          message: `Esperá ${rl.retry_after_seconds}s y volvé a preguntar.`,
          retry_after_seconds: rl.retry_after_seconds,
        },
        { status: 429, headers: { "Retry-After": String(rl.retry_after_seconds) } }
      );
    }
    const daily = await checkRateLimit(user.id, "assistant-daily", 100, 86400);
    if (!daily.allowed) {
      return NextResponse.json(
        { error: "daily_limit", message: "Llegaste al límite diario del asistente. Probá mañana." },
        { status: 429 }
      );
    }
  }

  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  // Ventana de los últimos turnos para acotar tokens. Anthropic exige que el
  // PRIMER mensaje sea del usuario, así que descartamos turnos de assistant que
  // queden al inicio de la ventana (pasa en conversaciones largas).
  const windowed = parsed.data.messages.slice(-12);
  const startIdx = windowed.findIndex((m) => m.role === "user");
  const trimmed = startIdx === -1 ? [] : windowed.slice(startIdx);

  if (trimmed.length === 0 || trimmed[trimmed.length - 1].role !== "user") {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Sanitizar SOLO el contenido del usuario (los turnos del assistant son nuestros).
  const messages: ChatMessage[] = trimmed.map((m) => ({
    role: m.role,
    content: m.role === "user" ? sanitizeInput(m.content) : m.content,
  }));

  try {
    const summary = await getUserProgressSummary(user.id);
    const system =
      ASSISTANT_SYSTEM_PROMPT +
      "\n\nESTADO ACTUAL DE ESTE USUARIO (usalo para personalizar; no lo recites textual):\n" +
      summaryToPromptText(summary);

    const reply = await callClaudeChat(system, messages, 700);
    return NextResponse.json({
      reply: reply.trim() || "Perdón, no pude responder eso. ¿Lo reformulás?",
    });
  } catch (err) {
    console.error("[ai/assistant]", err);
    return NextResponse.json({ error: "Error del asistente. Intentá de nuevo." }, { status: 500 });
  }
}
