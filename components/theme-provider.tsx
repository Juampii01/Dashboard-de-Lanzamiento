"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * Thin wrapper around next-themes. Persistence is handled by next-themes
 * (the established theming pattern in this project — already a dependency,
 * used by the Toaster). Theme is toggled via the `.dark` class on <html>,
 * matching the existing `@custom-variant dark (&:is(.dark *))` in globals.css.
 */
export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
