"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Ticket, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, StatusPill, ToggleRow } from "../_components/ui";
import { CUPO_DEFAULTS } from "@/lib/cupo-popup";

/**
 * Configuración de la ventana "¡Quiero mi cupo!" (pantalla completa, una sola
 * vez por participante). Se guarda en app_settings vía /api/admin/settings.
 */
export function CupoPopupPanel({ claimed }: { claimed: number }) {
  const [loaded, setLoaded] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [title, setTitle] = useState(CUPO_DEFAULTS.title);
  const [text, setText] = useState(CUPO_DEFAULTS.text);
  const [button, setButton] = useState(CUPO_DEFAULTS.button);
  const [whatsapp, setWhatsapp] = useState(CUPO_DEFAULTS.whatsapp);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d: Record<string, string>) => {
        setEnabled(d.cupo_popup_enabled === "true");
        if (d.cupo_popup_title) setTitle(d.cupo_popup_title);
        if (d.cupo_popup_text) setText(d.cupo_popup_text);
        if (d.cupo_popup_button) setButton(d.cupo_popup_button);
        if (d.cupo_popup_whatsapp) setWhatsapp(d.cupo_popup_whatsapp);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  async function save(key: string, value: string) {
    const r = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    if (!r.ok) throw new Error(key);
  }

  async function saveTexts() {
    setSaving(true);
    try {
      await save("cupo_popup_title", title);
      await save("cupo_popup_text", text);
      await save("cupo_popup_button", button);
      await save("cupo_popup_whatsapp", whatsapp);
      toast.success("Textos guardados");
    } catch {
      toast.error("No se pudo guardar");
    }
    setSaving(false);
  }

  async function toggle() {
    const next = !enabled;
    setSaving(true);
    try {
      await save("cupo_popup_enabled", next ? "true" : "false");
      setEnabled(next);
      toast.success(next ? "Ventana activada: la verán al entrar" : "Ventana desactivada");
    } catch {
      toast.error("No se pudo cambiar");
    }
    setSaving(false);
  }

  const input = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";

  return (
    <Panel
      icon={Ticket}
      tone="gold"
      title="Ventana “¡Quiero mi cupo!”"
      description="Pantalla completa que ven los participantes del en vivo (no admins) una sola vez. El botón abre WhatsApp con el mensaje “¡Quiero mi cupo! Soy [nombre] ([email])”. Quién lo tocó aparece abajo en la lista de leads."
    >
      {!loaded ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Cargando…</p>
      ) : (
        <div className="space-y-4">
          <ToggleRow
            title={enabled ? "Activa" : "Desactivada"}
            description={`${claimed} ${claimed === 1 ? "persona tocó" : "personas tocaron"} “¡Quiero mi cupo!”.`}
            on={enabled}
            onTone="success"
            pill={<StatusPill tone={enabled ? "success" : "muted"}>{enabled ? "ON" : "OFF"}</StatusPill>}
          >
            <Button size="sm" variant={enabled ? "outline" : "default"} onClick={toggle} disabled={saving}>
              {enabled ? "Desactivar" : "Activar"}
            </Button>
          </ToggleRow>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs font-semibold text-muted-foreground">
              Título
              <input className={input} value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="space-y-1 text-xs font-semibold text-muted-foreground">
              Texto del botón
              <input className={input} value={button} maxLength={80} onChange={(e) => setButton(e.target.value)} />
            </label>
            <label className="space-y-1 text-xs font-semibold text-muted-foreground sm:col-span-2">
              Texto de la oferta
              <textarea className={input} rows={3} value={text} maxLength={500} onChange={(e) => setText(e.target.value)} />
            </label>
            <label className="space-y-1 text-xs font-semibold text-muted-foreground">
              WhatsApp (con código de país, solo números)
              <input className={input} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value.replace(/[^\d]/g, ""))} />
            </label>
          </div>
          <Button size="sm" variant="outline" onClick={saveTexts} disabled={saving}>
            {saving ? "Guardando…" : "Guardar textos"}
          </Button>
        </div>
      )}
    </Panel>
  );
}
