// Sin dependencias de servidor: lo usa el middleware (proxy) y el cliente.

/** El JWT trae app_metadata.viewer_of: se lee sin ir a la base. */
export function isViewerJwt(user: { app_metadata?: Record<string, unknown> } | null | undefined): boolean {
  return !!user?.app_metadata?.viewer_of;
}

/** Rutas de API que un viewer sí puede llamar con POST (cerrar sesión). */
export const VIEWER_ALLOWED_WRITES = ["/api/auth/signout"];

export const VIEWER_READ_ONLY_MESSAGE = "Estás en modo visualización: no puedes hacer cambios.";
