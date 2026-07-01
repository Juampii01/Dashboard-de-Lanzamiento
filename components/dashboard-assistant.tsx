"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { Sparkles, X, Send, Bot } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "¿Por qué mi tarea sigue bloqueada?",
  "¿Cómo sumo más puntos?",
  "¿Cómo se desbloquean los días?",
  "¿Qué son los rangos y premios?",
];

export function DashboardAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll al fondo cuando llegan mensajes o aparece el "escribiendo".
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.map((m) => ({ role: m.role, content: m.content })) }),
      });
      const json = (await res.json().catch(() => ({}))) as { reply?: string; message?: string; error?: string };
      const reply = res.ok
        ? json.reply ?? "Perdón, no pude responder. Probá de nuevo."
        : json.message ?? "Hubo un error. Probá de nuevo en un momento.";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "No me pude conectar. Revisá tu conexión y probá de nuevo." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Botón flotante */}
      {!open && (
        <button
          type="button"
          aria-label="Abrir asistente de ayuda"
          onClick={() => setOpen(true)}
          style={{
            position: "fixed",
            right: 20,
            bottom: 20,
            zIndex: 9000,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 18px",
            borderRadius: 999,
            border: "none",
            cursor: "pointer",
            background: "var(--primary)",
            color: "var(--primary-foreground)",
            fontWeight: 800,
            fontSize: 14,
            fontFamily: "var(--font-sans)",
            boxShadow: "0 10px 30px -8px rgba(0,0,0,0.45)",
          }}
        >
          <Sparkles size={18} /> Ayuda
        </button>
      )}

      {/* Panel de chat */}
      {open && (
        <div
          style={{
            position: "fixed",
            right: 20,
            bottom: 20,
            zIndex: 9000,
            width: "min(380px, calc(100vw - 32px))",
            height: "min(560px, calc(100vh - 148px))",
            display: "flex",
            flexDirection: "column",
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "0 24px 70px -18px rgba(0,0,0,0.55)",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "13px 14px",
              borderBottom: "1px solid var(--border)",
              background: "color-mix(in srgb, var(--primary) 8%, var(--card))",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                width: 32, height: 32, borderRadius: 999, flexShrink: 0,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                background: "var(--primary)", color: "var(--primary-foreground)",
              }}
            >
              <Bot size={18} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: "var(--foreground)" }}>Asistente GovBidder</p>
              <p style={{ margin: 0, fontSize: 11, color: "var(--muted-foreground)" }}>Te ayudo con el dashboard</p>
            </div>
            <button
              type="button"
              aria-label="Cerrar"
              onClick={() => setOpen(false)}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "inline-flex", padding: 6 }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Mensajes */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Saludo */}
            <Bubble role="assistant">
              ¡Hola! 👋 Soy tu asistente del GovBidder Challenge. Preguntame lo que no entiendas: por qué algo está bloqueado, cómo sumar puntos, cómo funcionan los días, lo que sea.
            </Bubble>

            {messages.length === 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 2 }}>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    style={{
                      textAlign: "left",
                      padding: "9px 12px",
                      borderRadius: 10,
                      border: "1px solid var(--border)",
                      background: "var(--background)",
                      color: "var(--foreground)",
                      fontSize: 13,
                      cursor: "pointer",
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {messages.map((m, i) => (
              <Bubble key={i} role={m.role}>
                {m.content}
              </Bubble>
            ))}

            {loading && (
              <Bubble role="assistant">
                <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                  <Dot /> <Dot delay={0.15} /> <Dot delay={0.3} />
                </span>
              </Bubble>
            )}
          </div>

          {/* Input */}
          <div style={{ borderTop: "1px solid var(--border)", padding: 10, flexShrink: 0, display: "flex", gap: 8, alignItems: "flex-end" }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Escribí tu pregunta…"
              rows={1}
              style={{
                flex: 1,
                resize: "none",
                maxHeight: 96,
                border: "1px solid var(--border)",
                borderRadius: 10,
                background: "var(--background)",
                color: "var(--foreground)",
                fontSize: 14,
                fontFamily: "var(--font-sans)",
                padding: "9px 11px",
                outline: "none",
                lineHeight: 1.4,
              }}
            />
            <button
              type="button"
              aria-label="Enviar"
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
              style={{
                flexShrink: 0,
                width: 40, height: 40, borderRadius: 10,
                border: "none",
                cursor: loading || !input.trim() ? "default" : "pointer",
                background: "var(--primary)",
                color: "var(--primary-foreground)",
                opacity: loading || !input.trim() ? 0.5 : 1,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Send size={17} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// Render mínimo de markdown: **negrita** → <strong>. El resto queda como texto
// plano (whiteSpace: pre-wrap ya conserva los saltos de línea).
function renderLite(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function Bubble({ role, children }: { role: "user" | "assistant"; children: React.ReactNode }) {
  const isUser = role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
      <div
        style={{
          maxWidth: "85%",
          padding: "9px 12px",
          borderRadius: 12,
          borderTopRightRadius: isUser ? 3 : 12,
          borderTopLeftRadius: isUser ? 12 : 3,
          background: isUser ? "var(--primary)" : "var(--muted)",
          color: isUser ? "var(--primary-foreground)" : "var(--foreground)",
          fontSize: 13.5,
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {typeof children === "string" ? renderLite(children) : children}
      </div>
    </div>
  );
}

function Dot({ delay = 0 }: { delay?: number }) {
  return (
    <span
      className="animate-pulse"
      style={{
        width: 6, height: 6, borderRadius: 999,
        background: "var(--muted-foreground)",
        display: "inline-block",
        animationDelay: `${delay}s`,
        opacity: 0.6,
      }}
    />
  );
}
