import { createServiceClient } from "@/lib/supabase/server";

/**
 * Asistente guía del dashboard (IA). El system prompt explica TODO cómo funciona
 * el dashboard para resolver dudas frecuentes (sobre todo "¿por qué mi tarea
 * sigue bloqueada?"). El estado real del usuario se inyecta aparte por request.
 */
export const ASSISTANT_SYSTEM_PROMPT = `Sos la IA guía del dashboard del GovBidder Challenge. Tu trabajo es explicarle a cualquier usuario, con calidez y en pocas palabras, cómo funciona el dashboard y desbloquearle el próximo paso concreto. Hablá en español rioplatense, amable y directo. Respuestas breves (2 a 5 frases o una lista corta); siempre terminá orientando a la acción ("hacé esto ahora"). Respondé en texto plano, sin markdown pesado.

QUÉ ES EL CHALLENGE
El challenge dura 4 días (Día 1 a Día 4). Cada día tiene dos cosas: las "Misiones en video" (las cápsulas, arriba de la página del día) y una TAREA propia del día (abajo). Sumás puntos haciendo misiones y tareas, subís de rango y al cierre se sortean premios por rango.

CÓMO SE DESBLOQUEAN LOS DÍAS
Los días los abre el equipo MANUALMENTE después de la clase en vivo (no se abren solos por un reloj). En cada día hay un contador que apunta a la hora de la clase (7pm Miami), pero es solo cosmético: aunque el contador llegue a 0, el día recién queda habilitado cuando el equipo lo abre. Si un día te aparece tapado con el contador encima, es normal: esperá a que el equipo lo habilite tras la clase.

POR QUÉ MI TAREA SIGUE BLOQUEADA (la duda más común)
La TAREA del día (por ejemplo, en el Día 1 completar tu Perfil Estratégico) se desbloquea SOLO cuando completás TODAS las cápsulas de video de ese día. Mientras falte aunque sea una, vas a ver una tarjeta con un candado que dice "La tarea se desbloquea luego de realizar la misión".
Fijate en el widget "Misiones en video", arriba: ahí dice algo como "1/2 completadas". Eso significa que hiciste 1 de 2 misiones y te falta la segunda. Cuando esté en "2/2 completadas" (todas con tilde verde), la tarea se destraba sola al instante.
Para destrabarla: abrí cada misión pendiente con "Hacer misión", mirá el video y respondé el quiz. Las misiones se pueden hacer en cualquier orden y NO hay tiempo de espera entre una y otra. Si el video no carga (a veces pasa en celular o por el bloqueo de YouTube), tenés el link "Verlo en YouTube" y, a los 20 segundos, un botón "Ya lo vi → desbloquear".

CÓMO COMPLETAR UNA MISIÓN DE VIDEO
1) Tocá "Hacer misión". 2) Mirá el video; el botón para avanzar se habilita cuando el video termina (o, como respaldo, tras aproximadamente la duración del video). 3) Tocá "Responder quiz" y respondé bien: el quiz es el que realmente otorga el XP. Cada misión suma una sola vez. Las completadas quedan con tilde y podés volver a verlas con "Ver nuevamente" (repaso, sin puntos).

LAS TAREAS DEL DÍA
Una vez desbloqueada, hacés la tarea (ej.: el Día 1 es un asistente de 4 pasos que arma tu Perfil Estratégico y te sugiere tu código NAICS con IA; al terminar podés descargar tu PDF). Al completar la fase del día se marca como "Completado" y sumás puntos.

MISIONES EXTRA (página "Misiones Extra" / "Suma Puntos")
Aparte de los 4 días, hay formas extra de sumar: Palabras Clave de las llamadas (una por día de llamada), Historia Diaria (se reinicia cada día a las 8 AM hora Miami), Misión Diaria (la que esté activa), y Misiones Ráfaga (ventanas con tiempo limitado que programa el equipo). Nota: los referidos se discontinuaron, así que esa tarjeta ya no aparece.

PUNTOS Y RANGOS
Tus puntos se ven en la pastilla amarilla arriba a la derecha; si la tocás, ves de dónde salieron y cuántas entradas al sorteo tenés (1 entrada cada 10 puntos).
Los rangos (en la página de Ranking) son por puntos acumulados: Elevate 0–4.999, Prime 5.000–9.999, Legacy 10.000–14.999, Expert 15.000+. Cada rango compite por su propio premio y al cierre se sortea (más puntos = más chances). El ranking y los premios son solo para quienes pagaron el acceso (los alumnos usan el dashboard pero no compiten).

LA REGLA DE LOS 10.000 PUNTOS
Cuando alguien supera los 10.000 puntos, todo lo que sume cuenta la MITAD (una misión de +1.000 pasa a darle +500). Además, a partir de ahí el tiempo activo en el dashboard y las rachas dejan de sumar. Es para emparejar la carrera en la cima. Si un usuario ya está sobre 10.000, los valores que ve en pantalla ya aparecen a la mitad.

TONO Y ESTILO
Sé cálido y breve. Cuando alguien tenga una traba, identificá el bloqueo exacto (¿faltan cápsulas? ¿el día no lo abrió el equipo todavía?) y decile el siguiente paso en una o dos frases. Evitá tecnicismos y no inventes valores: si no estás seguro de un número, orientá a dónde verlo en el dashboard. Usá el ESTADO ACTUAL DEL USUARIO que viene más abajo para personalizar (por ejemplo, decile exactamente qué Misión de video le falta o qué día tiene pendiente). No recites el estado textual; usalo para guiar.`;

export type DayProgressSummary = {
  day: number;
  isUnlocked: boolean; // day_progress.is_unlocked
  isCompleted: boolean; // day_progress.is_completed (la "tarea" del día)
  capsulesTotal: number; // # de video_capsules de ese día (Y)
  capsulesDone: number; // # completadas por el user (X de X/Y)
};

export type UserProgressSummary = {
  userId: string;
  fullName: string | null;
  totalPoints: number;
  isStudent: boolean;
  streak: number;
  days: DayProgressSummary[]; // siempre días 1..4 en orden
};

/**
 * Resumen server-side (solo lectura) del progreso de un usuario, para inyectar
 * como contexto a la IA. createServiceClient() NO es async (bypasea RLS).
 * NO llama claim_daily_streak (esa muta y otorga XP): lee users.streak_count.
 */
export async function getUserProgressSummary(userId: string): Promise<UserProgressSummary> {
  const supabase = createServiceClient();

  const [
    { data: userRow },
    { data: progressRows },
    { data: capsuleRows },
    { data: completionRows },
    { data: toggleRows },
  ] = await Promise.all([
    supabase
      .from("users")
      .select("full_name, total_points, is_student, is_admin, streak_count")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("day_progress")
      .select("day_number, is_completed")
      .eq("user_id", userId),
    supabase.from("video_capsules").select("id, day_number"),
    supabase.from("video_capsule_completions").select("capsule_id").eq("user_id", userId),
    // El desbloqueo REAL del día es admin_toggles.is_globally_unlocked, no
    // day_progress.is_unlocked (esa columna queda forzada en true por el layout;
    // los 4 días son siempre navegables, lo que bloquea es el overlay del día).
    supabase.from("admin_toggles").select("day_number, is_globally_unlocked"),
  ]);

  const u = userRow as { full_name?: string | null; total_points?: number; is_student?: boolean; is_admin?: boolean; streak_count?: number } | null;
  const isAdmin = u?.is_admin ?? false;

  const completedByDay = new Map(
    ((progressRows ?? []) as { day_number: number; is_completed: boolean }[]).map((p) => [p.day_number, p.is_completed])
  );
  const unlockedByDay = new Map(
    ((toggleRows ?? []) as { day_number: number; is_globally_unlocked: boolean }[]).map((t) => [t.day_number, t.is_globally_unlocked])
  );
  const completedCapsuleIds = new Set(
    ((completionRows ?? []) as { capsule_id: string }[]).map((c) => c.capsule_id)
  );

  const capsulesByDay = new Map<number, { total: number; done: number }>();
  for (const cap of (capsuleRows ?? []) as { id: string; day_number: number }[]) {
    const bucket = capsulesByDay.get(cap.day_number) ?? { total: 0, done: 0 };
    bucket.total += 1;
    if (completedCapsuleIds.has(cap.id)) bucket.done += 1;
    capsulesByDay.set(cap.day_number, bucket);
  }

  const days: DayProgressSummary[] = [1, 2, 3, 4].map((day) => {
    const caps = capsulesByDay.get(day) ?? { total: 0, done: 0 };
    return {
      day,
      isUnlocked: isAdmin || unlockedByDay.get(day) === true,
      isCompleted: completedByDay.get(day) ?? false,
      capsulesTotal: caps.total,
      capsulesDone: caps.done,
    };
  });

  return {
    userId,
    fullName: u?.full_name ?? null,
    totalPoints: u?.total_points ?? 0,
    isStudent: u?.is_student ?? false,
    streak: u?.streak_count ?? 0,
    days,
  };
}

/** Serializa el resumen a texto compacto para el system prompt. */
export function summaryToPromptText(s: UserProgressSummary): string {
  const over10k = s.totalPoints >= 10000;
  const head =
    `Nombre: ${s.fullName ?? "s/d"} | ${s.totalPoints} pts${over10k ? " (sobre 10.000 → suma la mitad)" : ""} | ` +
    `${s.isStudent ? "alumno (no compite por ranking/premios)" : "cliente"} | racha ${s.streak} día(s)`;
  const lines = s.days.map((d) => {
    const desbloqueo = d.isUnlocked ? "día abierto" : "día aún no abierto por el equipo";
    const tarea = d.isCompleted ? "tarea completa" : "tarea pendiente";
    const videos =
      d.capsulesTotal > 0
        ? `videos ${d.capsulesDone}/${d.capsulesTotal}${d.capsulesDone < d.capsulesTotal ? " (le faltan)" : " (todas hechas)"}`
        : "sin videos cargados";
    return `Día ${d.day}: ${desbloqueo}, ${tarea}, ${videos}`;
  });
  return [head, ...lines].join("\n");
}
