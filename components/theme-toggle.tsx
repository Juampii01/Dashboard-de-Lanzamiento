"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

/**
 * Persistent light/dark toggle. Persistence handled by next-themes.
 * Renders a stable placeholder before mount to avoid hydration mismatch.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label={isDark ? "Activar modo claro" : "Activar modo oscuro"}
      title={isDark ? "Modo claro" : "Modo oscuro"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="theme-toggle"
    >
      {mounted ? (
        isDark ? <Sun size={16} strokeWidth={2.2} /> : <Moon size={16} strokeWidth={2.2} />
      ) : (
        <span style={{ width: 16, height: 16, display: "inline-block" }} />
      )}
    </button>
  );
}
