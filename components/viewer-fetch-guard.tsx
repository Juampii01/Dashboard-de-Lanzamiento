"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { VIEWER_READ_ONLY_MESSAGE } from "@/lib/viewer-shared";

// Para viewers: cuando una acción choca con el bloqueo de solo lectura (403 del
// middleware), se muestra un aviso claro en vez del error genérico del botón.
export function ViewerFetchGuard() {
  useEffect(() => {
    const original = window.fetch;
    let last = 0;
    window.fetch = async (...args) => {
      const res = await original(...args);
      if (res.status === 403) {
        const body = await res.clone().json().catch(() => null);
        if (body?.error === "viewer_read_only" && Date.now() - last > 1500) {
          last = Date.now();
          toast.info(VIEWER_READ_ONLY_MESSAGE);
        }
      }
      return res;
    };
    return () => {
      window.fetch = original;
    };
  }, []);
  return null;
}
