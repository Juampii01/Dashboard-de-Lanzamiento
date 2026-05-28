/**
 * WOW Effects — Govbidder Challenge v4
 * Web Animations API, no dependencies. All DOM elements self-clean on finish.
 */

type ParticleColor = "gold" | "green" | "cyan";

/** Explosion radial de partículas cuadradas desde (x, y) */
export function createParticleBurst(
  x: number,
  y: number,
  color: ParticleColor,
  count = 20
): void {
  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    p.className = `wow-particle ${color}`;
    p.style.cssText = `left:${x}px; top:${y}px;`;
    document.body.appendChild(p);

    const angle = (i / count) * Math.PI * 2;
    const dist  = 70 + Math.random() * 110;
    const dx    = Math.cos(angle) * dist;
    const dy    = Math.sin(angle) * dist;

    const anim = p.animate(
      [
        { transform: "translate(-50%,-50%) scale(1)   rotate(0deg)",   opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.25) rotate(180deg)`, opacity: 0 },
      ],
      { duration: 750 + Math.random() * 350, easing: "cubic-bezier(0.34,1.56,0.64,1)" }
    );
    anim.onfinish = () => p.remove();
  }
}

/** Etiqueta "+PTS" que vuela en curva parabólica de from → to */
export function flyPoints(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  text = "+50 PTS"
): void {
  const label = document.createElement("div");
  label.className = "wow-pts-fly";
  label.textContent = text;
  label.style.cssText = `left:${fromX}px; top:${fromY}px;`;
  document.body.appendChild(label);

  const midX = (fromX + toX) / 2;
  const midY = Math.min(fromY, toY) - 90;

  const anim = label.animate(
    [
      { left: `${fromX}px`, top: `${fromY}px`, transform: "scale(0.5)", opacity: 0, offset: 0 },
      { left: `${fromX}px`, top: `${fromY}px`, transform: "scale(1.4)", opacity: 1, offset: 0.14 },
      { left: `${midX}px`,  top: `${midY}px`,  transform: "scale(1.1)", opacity: 1, offset: 0.58 },
      { left: `${toX}px`,   top: `${toY}px`,   transform: "scale(0.5)", opacity: 0, offset: 1 },
    ],
    { duration: 1050, easing: "cubic-bezier(0.4,0,0.2,1)" }
  );
  anim.onfinish = () => label.remove();
}

/** Flash dorado fullscreen */
export function triggerFlash(color = "rgba(255,214,10,0.28)"): void {
  const el = document.createElement("div");
  el.style.cssText = `
    position:fixed; inset:0; z-index:99996; pointer-events:none;
    background: radial-gradient(ellipse 80% 60% at 50% 50%, ${color} 0%, transparent 72%);
  `;
  document.body.appendChild(el);
  const anim = el.animate(
    [
      { opacity: 0 },
      { opacity: 1, offset: 0.18 },
      { opacity: 0.85, offset: 0.55 },
      { opacity: 0 },
    ],
    { duration: 900, easing: "ease-out" }
  );
  anim.onfinish = () => el.remove();
}

/** Screen shake en el body (agrega / quita clase CSS) */
export function triggerScreenShake(): void {
  document.body.classList.add("body-shake");
  setTimeout(() => document.body.classList.remove("body-shake"), 700);
}

/** 5 estrellas doradas que suben desde (cx, cy) — easter egg avatar */
export function triggerAvatarStars(cx: number, cy: number): void {
  for (let i = 0; i < 5; i++) {
    const star = document.createElement("div");
    star.className = "wow-avatar-star";
    star.textContent = "★";
    star.style.cssText = `left:${cx}px; top:${cy}px;`;
    document.body.appendChild(star);

    const dx = (Math.random() - 0.5) * 90;
    const dy = -55 - Math.random() * 50;

    const anim = star.animate(
      [
        { transform: "translate(0,0) scale(0.5)",                      opacity: 1 },
        { transform: `translate(${dx}px,${dy}px) scale(1.3)`,          opacity: 1, offset: 0.5 },
        { transform: `translate(${dx*1.5}px,${dy*1.9}px) scale(0)`,   opacity: 0 },
      ],
      { duration: 1100 + i * 60, easing: "cubic-bezier(0.34,1.56,0.64,1)", delay: i * 70 }
    );
    anim.onfinish = () => star.remove();
  }
}
