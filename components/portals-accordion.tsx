"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PORTALS, CATEGORY_ORDER } from "@/lib/portals-data";

/**
 * Acordeón compartido de portales (Día 3 "Tu sorpresa" + Día 4 "premio").
 * Cada categoría es un título desplegable; cada portal una fila con botón "Ir".
 */
export function PortalsAccordion({ defaultOpenKey = "ecosistema" }: { defaultOpenKey?: string }) {
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {CATEGORY_ORDER.map((cat) => {
        const list = PORTALS.filter((p) => p.category === cat.key);
        if (list.length === 0) return null;
        const catOpen = openCats[cat.key] ?? (cat.key === defaultOpenKey);
        return (
          <div key={cat.key} className="border rounded-xl overflow-hidden" style={{ borderColor: "var(--border)" }}>
            <button
              type="button"
              onClick={() => setOpenCats((prev) => ({ ...prev, [cat.key]: !catOpen }))}
              aria-expanded={catOpen}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
            >
              <span className="font-bold text-sm text-foreground">
                {cat.label} <span className="font-normal text-muted-foreground">({list.length})</span>
              </span>
              <ChevronDown className="w-4 h-4 flex-shrink-0 text-muted-foreground" style={{ transform: catOpen ? "rotate(180deg)" : "none", transition: "transform var(--dur-fast) var(--ease-out)" }} />
            </button>
            {catOpen && (
              <div className="px-2.5 pb-2.5 pt-0.5 space-y-1.5">
                {list.map((portal) => (
                  <div key={portal.name} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-muted/60 transition-colors">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-foreground">{portal.name}</p>
                      {portal.description && (
                        <p className="text-xs text-muted-foreground">{portal.description}</p>
                      )}
                      {portal.prereq && (
                        <p className="text-[11px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>📋 Ten listo: {portal.prereq}</p>
                      )}
                    </div>
                    <Button variant="outline" size="sm" asChild className="flex-shrink-0">
                      <a href={portal.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                        Ir <ExternalLink className="w-3 h-3" />
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
