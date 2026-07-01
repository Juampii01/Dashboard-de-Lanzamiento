"use client";

import { useEffect } from "react";

const isBrowser = typeof window !== "undefined";

/**
 * Borrador de un formulario largo (wizard) guardado en localStorage, para que
 * un F5 accidental, el botón "Atrás" del navegador o que se caiga la conexión
 * no borren lo que el usuario ya escribió antes de guardarlo en la base.
 *
 * Solo se lee/escribe en efectos de cliente (nunca en el render inicial) para
 * no romper la hidratación SSR — el primer render siempre usa los defaults del
 * server; el draft (si existe) se restaura después, en el cliente.
 */
export function loadDraft<T>(key: string): T | null {
  if (!isBrowser) return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function clearDraft(key: string) {
  if (!isBrowser) return;
  try { window.localStorage.removeItem(key); } catch { /* noop */ }
}

/** Autoguarda `value` en localStorage cada vez que cambia, mientras `enabled` sea true. */
export function useAutosaveDraft(key: string, value: unknown, enabled = true) {
  useEffect(() => {
    if (!enabled || !isBrowser) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage lleno o deshabilitado (modo privado) — no rompe la app */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, JSON.stringify(value)]);
}
