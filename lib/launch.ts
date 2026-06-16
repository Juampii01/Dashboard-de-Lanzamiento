/**
 * Fecha de habilitación del dashboard (lock de pre-lanzamiento).
 * Módulo SERVER-SAFE (sin "use client") para que el layout (Server Component)
 * pueda leer el valor real — si esto vive en un archivo "use client", el server
 * recibe undefined y el gate de fecha nunca se evalúa bien.
 *
 * 29 de junio, 4:00 PM hora Miami (EDT = UTC-4) → 20:00 UTC.
 */
export const LAUNCH_ISO = "2026-06-29T20:00:00Z";
