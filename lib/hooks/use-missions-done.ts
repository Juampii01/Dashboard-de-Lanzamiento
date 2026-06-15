"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * useMissionsDone — indica si TODAS las misiones (cápsulas de video) de un día
 * están completadas por el usuario. Se usa para bloquear la tarea del día hasta
 * que hagan la misión primero.
 *
 * Reactivo: re-consulta al completarse una misión (evento `xp-gained`).
 * En devMode se considera siempre desbloqueado (para testear sin fricción).
 */
export function useMissionsDone(day: number, devMode = false) {
  const [missionsDone, setMissionsDone] = useState(devMode);
  const [loading, setLoading] = useState(!devMode);

  const check = useCallback(async () => {
    if (devMode) { setMissionsDone(true); setLoading(false); return; }
    try {
      const res = await fetch(`/api/capsules?day=${day}`);
      if (!res.ok) { setLoading(false); return; }
      const data = await res.json() as { capsules?: { completed: boolean }[] };
      const caps = data.capsules ?? [];
      // Si no hay misiones cargadas para el día, no bloqueamos la tarea.
      setMissionsDone(caps.length === 0 || caps.every((c) => c.completed));
    } catch {
      /* ante error de red, no bloqueamos */
      setMissionsDone(true);
    } finally {
      setLoading(false);
    }
  }, [day, devMode]);

  useEffect(() => { check(); }, [check]);

  // Re-chequear cuando se gana XP de un video (misión completada).
  useEffect(() => {
    const handler = (e: Event) => {
      const src = (e as CustomEvent<{ source?: string }>).detail?.source;
      if (src === "video" || src === "podcast") check();
    };
    window.addEventListener("xp-gained", handler);
    return () => window.removeEventListener("xp-gained", handler);
  }, [check]);

  return { missionsDone, loading };
}
