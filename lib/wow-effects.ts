/**
 * Reward feedback — sober, premium SaaS edition.
 *
 * Function signatures are kept identical so existing call sites need no changes.
 * The arcade-style juice (particle explosions, screen shake, easter-egg stars)
 * is intentionally removed; what remains is a single, restrained "+XP" cue.
 * All motion respects prefers-reduced-motion.
 */

type ParticleColor = "gold" | "green" | "cyan";

const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

/**
 * Particle explosion — REMOVED (too "videogame").
 * Kept as a no-op so call sites keep working.
 */
export function createParticleBurst(
  _x: number,
  _y: number,
  _color: ParticleColor,
  _count = 20
): void {
  /* intentionally empty — sober redesign */
}

/**
 * Floating "+XP" label that rises briefly and fades. This is the single
 * retained reward cue: subtle, fast, navy/neutral (styled via .wow-pts-fly).
 */
export function flyPoints(
  fromX: number,
  fromY: number,
  _toX: number,
  _toY: number,
  text = "+50 XP"
): void {
  if (typeof document === "undefined") return;
  if (prefersReducedMotion()) return; // honor reduced-motion: no floating motion

  const label = document.createElement("div");
  label.className = "wow-pts-fly";
  label.textContent = text;
  label.style.cssText = `left:${fromX}px; top:${fromY}px;`;
  document.body.appendChild(label);

  const anim = label.animate(
    [
      { transform: "translate(-50%, -50%) translateY(0) scale(0.96)", opacity: 0, offset: 0 },
      { transform: "translate(-50%, -50%) translateY(-6px) scale(1)",  opacity: 1, offset: 0.25 },
      { transform: "translate(-50%, -50%) translateY(-22px) scale(1)", opacity: 1, offset: 0.7 },
      { transform: "translate(-50%, -50%) translateY(-34px) scale(0.98)", opacity: 0, offset: 1 },
    ],
    { duration: 900, easing: "cubic-bezier(0.4, 0, 0.2, 1)" }
  );
  anim.onfinish = () => label.remove();
}

/**
 * Brief, very subtle full-screen tint. Used for day completion and (in red)
 * for validation errors. Much softer than the old gold flash.
 */
export function triggerFlash(color = "rgba(22,166,95,0.10)"): void {
  if (typeof document === "undefined") return;
  if (prefersReducedMotion()) return;

  const el = document.createElement("div");
  el.style.cssText = `
    position:fixed; inset:0; z-index:99996; pointer-events:none;
    background: radial-gradient(ellipse 90% 70% at 50% 50%, ${color} 0%, transparent 70%);
  `;
  document.body.appendChild(el);
  const anim = el.animate(
    [{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 0 }],
    { duration: 520, easing: "ease-out" }
  );
  anim.onfinish = () => el.remove();
}

/**
 * Screen shake — REMOVED. No-op kept for compatibility.
 */
export function triggerScreenShake(): void {
  /* intentionally empty — sober redesign */
}

/**
 * Easter-egg avatar stars — REMOVED. No-op kept for compatibility.
 */
export function triggerAvatarStars(_cx: number, _cy: number): void {
  /* intentionally empty — sober redesign */
}
