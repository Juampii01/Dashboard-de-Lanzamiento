"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number; y: number;
  size: number; vx: number; vy: number;
  alpha: number; dAlpha: number;
}

export function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    let particles: Particle[] = [];
    const SPACING = 42;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles = Array.from({ length: 55 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.6 + 0.4,
        vx: (Math.random() - 0.5) * 0.22,
        vy: -(Math.random() * 0.28 + 0.05),
        alpha: Math.random() * 0.3 + 0.05,
        dAlpha: (Math.random() - 0.5) * 0.004,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mx = mouse.current.x;
      const my = mouse.current.y;
      const cols = Math.ceil(canvas.width / SPACING) + 1;
      const rows = Math.ceil(canvas.height / SPACING) + 1;
      const MOUSE_R  = 150;
      const MOUSE_R2 = MOUSE_R * MOUSE_R;

      // ── Dot grid — batched by color to minimise canvas state changes ────────
      // Pass 1: all base dots in a single path → single fill() call
      ctx.beginPath();
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * SPACING, y = j * SPACING;
          const dx = x - mx, dy = y - my;
          if (dx * dx + dy * dy >= MOUSE_R2) {
            ctx.moveTo(x + 0.8, y);
            ctx.arc(x, y, 0.8, 0, Math.PI * 2);
          }
        }
      }
      ctx.fillStyle = "rgba(30,58,92,0.14)";
      ctx.fill();

      // Pass 2: only dots within mouse radius (much fewer; drawn individually for colour variation)
      if (mx > -100) {
        const iStart = Math.max(0, Math.floor((mx - MOUSE_R) / SPACING));
        const iEnd   = Math.min(cols - 1, Math.ceil((mx + MOUSE_R) / SPACING));
        const jStart = Math.max(0, Math.floor((my - MOUSE_R) / SPACING));
        const jEnd   = Math.min(rows - 1, Math.ceil((my + MOUSE_R) / SPACING));
        for (let i = iStart; i <= iEnd; i++) {
          for (let j = jStart; j <= jEnd; j++) {
            const x = i * SPACING, y = j * SPACING;
            const dx = x - mx, dy = y - my;
            const distSq = dx * dx + dy * dy;
            if (distSq < MOUSE_R2) {
              const glow = 1 - Math.sqrt(distSq) / MOUSE_R;
              ctx.beginPath();
              ctx.arc(x, y, 0.8 + glow * 2, 0, Math.PI * 2);
              ctx.fillStyle = glow > 0.25
                ? `rgba(215,38,61,${0.08 + glow * 0.55})`
                : `rgba(30,58,92,${0.14 + glow * 0.2})`;
              ctx.fill();
            }
          }
        }

        // Red radial mouse glow
        const g = ctx.createRadialGradient(mx, my, 0, mx, my, 160);
        g.addColorStop(0, "rgba(215,38,61,0.07)");
        g.addColorStop(1, "rgba(215,38,61,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // ── Floating green particles ──────────────────────────────────────────
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        p.alpha += p.dAlpha;
        if (p.y < -8) { p.y = canvas.height + 5; p.x = Math.random() * canvas.width; }
        if (p.x < -8) p.x = canvas.width + 5;
        if (p.x > canvas.width + 8) p.x = -5;
        if (p.alpha < 0.02) p.dAlpha = Math.abs(p.dAlpha);
        if (p.alpha > 0.45) p.dAlpha = -Math.abs(p.dAlpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,214,122,${p.alpha})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    const onMove = (e: MouseEvent) => { mouse.current = { x: e.clientX, y: e.clientY }; };
    const onLeave = () => { mouse.current = { x: -9999, y: -9999 }; };

    resize();
    draw();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" aria-hidden />;
}
