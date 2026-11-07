/**
 * Viewers: cuentas de solo lectura que ven la cuenta de quien las invitó.
 *
 * - `users.viewer_of` = id del anfitrión. Toda LECTURA de la app usa
 *   `getActor(authId).userId` (el anfitrión si es viewer) en lugar de `user.id`.
 * - Toda ESCRITURA de un viewer se corta en el middleware (lib/supabase/middleware.ts)
 *   leyendo `app_metadata.viewer_of` del JWT, y RLS solo le da SELECT sobre las filas
 *   del anfitrión.
 */
import { cache } from "react";
import { createServiceClient } from "@/lib/supabase/server";

export const MAX_VIEWERS_PER_USER = 2;

export type Actor = {
  /** Usuario logueado (auth.uid()). */
  authId: string;
  /** Usuario cuyos datos se muestran: el anfitrión si es viewer, si no el propio. */
  userId: string;
  isViewer: boolean;
  hostName: string | null;
};

export const getActor = cache(async (authId: string): Promise<Actor> => {
  const db = createServiceClient();
  const { data } = await db.from("users").select("viewer_of").eq("id", authId).maybeSingle();
  const hostId = (data as { viewer_of?: string | null } | null)?.viewer_of ?? null;
  if (!hostId) return { authId, userId: authId, isViewer: false, hostName: null };
  const { data: host } = await db.from("users").select("full_name").eq("id", hostId).maybeSingle();
  return {
    authId,
    userId: hostId,
    isViewer: true,
    hostName: (host as { full_name?: string | null } | null)?.full_name ?? null,
  };
});

export { isViewerJwt, VIEWER_ALLOWED_WRITES } from "@/lib/viewer-shared";
