"use client";

import { useEffect, useState } from "react";

/**
 * useUserAvatar — fuente de verdad ÚNICA para el avatar del usuario.
 *
 * Resuelve la URL en este orden:
 *   1. `serverAvatarUrl` — el valor de `users.avatar_url` que llega del server
 *      (una URL pública y estable de Supabase Storage vía getPublicUrl, no signed).
 *   2. localStorage (`govbidder_avatar_url_v1`) — por si se subió esta/última sesión
 *      y el prop del server todavía no lo refleja.
 *
 * Se mantiene sincronizado ante subidas/eliminaciones desde CUALQUIER componente
 * mediante el evento global `avatar-updated`. Así la barra de progreso y el sidebar
 * leen siempre lo mismo (antes cada uno duplicaba esta lógica y divergían).
 *
 * El consumidor decide el fallback visual (`/aguila.png`) usando `hasPhoto`.
 */

const LS_KEY = "govbidder_avatar_url_v1";
export const AVATAR_FALLBACK = "/aguila.png";

export function useUserAvatar(serverAvatarUrl?: string | null) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(serverAvatarUrl ?? null);

  // Server value (con fallback a localStorage si el server no dio nada).
  useEffect(() => {
    if (serverAvatarUrl) {
      setPhotoUrl(serverAvatarUrl);
      return;
    }
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored) setPhotoUrl(stored);
    } catch {
      /* localStorage no disponible — ignorar */
    }
  }, [serverAvatarUrl]);

  // Sincronización global ante upload/delete (un solo lugar que escribe localStorage).
  useEffect(() => {
    const handler = (e: Event) => {
      const next = (e as CustomEvent<{ url: string | null }>).detail?.url ?? null;
      setPhotoUrl(next);
      try {
        if (next) localStorage.setItem(LS_KEY, next);
        else localStorage.removeItem(LS_KEY);
      } catch {
        /* ignorar */
      }
    };
    window.addEventListener("avatar-updated", handler);
    return () => window.removeEventListener("avatar-updated", handler);
  }, []);

  return {
    /** URL de la foto del usuario, o null si no tiene. */
    photoUrl,
    /** true si el usuario tiene foto propia (si no, usar el fallback). */
    hasPhoto: !!photoUrl,
    /** Siempre renderizable: la foto o el fallback. */
    src: photoUrl ?? AVATAR_FALLBACK,
  };
}
