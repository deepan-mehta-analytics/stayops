"use client";                                                         // client component — uses browser APIs
import { ThemeProvider as NextThemesProvider } from "next-themes";    // next-themes provider handles class injection
import type { ComponentProps } from "react";                           // typed props pass-through

// ── Thin wrapper so layout.tsx imports a local path ───────
export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>; // delegate all props to next-themes
}
