"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface Click {
  id: string;
  user_id: string;
  button: string;
  clicked_at: string;
  full_name: string | null;
  email: string;
}

const BUTTON_LABEL: Record<string, string> = {
  pagar_ahora: "💳 Pagar ahora",
  whatsapp: "💬 Hablar con el equipo",
};

export function ProximoPasoClicksPanel() {
  const [clicks, setClicks] = useState<Click[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/proximo-paso-clicks")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setClicks(d.clicks ?? []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin inline" /> Cargando...</p>;
  }

  if (clicks.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía nadie tocó ninguno de los dos botones.</p>;
  }

  const pagoCount = clicks.filter((c) => c.button === "pagar_ahora").length;
  const whatsappCount = clicks.filter((c) => c.button === "whatsapp").length;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        💳 Pagar ahora: <strong>{pagoCount}</strong> &nbsp;·&nbsp; 💬 WhatsApp: <strong>{whatsappCount}</strong>
      </p>
      <div className="max-h-80 overflow-y-auto space-y-1.5 pr-1">
        {clicks.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3 p-2 rounded-lg border text-sm" style={{ borderColor: "#1E3A5C" }}>
            <div className="min-w-0">
              <p className="font-semibold truncate">{c.full_name || c.email || "—"}</p>
              <p className="text-xs text-muted-foreground truncate">{c.email}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-semibold">{BUTTON_LABEL[c.button] ?? c.button}</p>
              <p className="text-[10px] text-muted-foreground">
                {new Date(c.clicked_at).toLocaleString("es-US", { dateStyle: "short", timeStyle: "short" })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
