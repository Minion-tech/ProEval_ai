"use client"

import * as React from "react"

type Theme = "light" | "dark" | "system"
type ResolvedTheme = "light" | "dark"

type ThemeContextValue = {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined)

const STORAGE_KEY = "proeval-theme"

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function getStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null
    if (stored === "light" || stored === "dark" || stored === "system") return stored
    return null
  } catch {
    return null
  }
}

function applyTheme(resolved: ResolvedTheme) {
  const root = document.documentElement
  root.classList.remove("light", "dark")
  root.classList.add(resolved)
  root.style.colorScheme = resolved
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
}: {
  children: React.ReactNode
  defaultTheme?: Theme
}) {
  const [theme, setThemeState] = React.useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme
    return getStoredTheme() ?? defaultTheme
  })

  const [systemTheme, setSystemTheme] = React.useState<ResolvedTheme>(() => getSystemTheme())

  const resolvedTheme: ResolvedTheme = theme === "system" ? systemTheme : theme

  // Persist and apply when theme changes
  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {}
    applyTheme(resolvedTheme)
  }, [theme, resolvedTheme])

  // Listen to system changes
  React.useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)")
    const handleChange = () => {
      const nextSystem = mql.matches ? "dark" : "light"
      setSystemTheme(nextSystem)
      // Only apply immediately if in system mode; otherwise just update systemTheme for future
      if (theme === "system") {
        applyTheme(nextSystem)
      }
    }
    mql.addEventListener("change", handleChange)
    return () => mql.removeEventListener("change", handleChange)
  }, [theme])

  // Sync systemTheme on mount (in case script and state mismatch)
  React.useEffect(() => {
    setSystemTheme(getSystemTheme())
  }, [])

  const setTheme = React.useCallback((next: Theme) => {
    setThemeState(next)
    // resolved and apply will happen via effect above, but also apply immediately for instant feedback
    const resolved = next === "system" ? getSystemTheme() : next
    applyTheme(resolved)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider")
  }
  return ctx
}

// Inline script to prevent flash of incorrect theme (FOUC)
// Must be rendered inside <html> before body
export function ThemeScript() {
  const script = `
(function() {
  try {
    var key = "proeval-theme";
    var stored = localStorage.getItem(key);
    var theme = stored || "system";
    var resolved = theme;
    if (theme === "system") {
      resolved = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    var root = document.documentElement;
    root.classList.remove("light","dark");
    root.classList.add(resolved);
    root.style.colorScheme = resolved;
  } catch(e) {}
})();
`.trim()

  return <script dangerouslySetInnerHTML={{ __html: script }} suppressHydrationWarning />
}
