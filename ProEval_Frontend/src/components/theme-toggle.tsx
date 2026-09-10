"use client"

import * as React from "react"
import { IconSun, IconMoon, IconDeviceDesktop } from "@tabler/icons-react"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"

const cycleOrder = ["light", "dark", "system"] as const
type CycleTheme = (typeof cycleOrder)[number]

function getNextTheme(current: string): CycleTheme {
  const idx = cycleOrder.indexOf(current as CycleTheme)
  const nextIdx = (idx + 1) % cycleOrder.length
  return cycleOrder[nextIdx]
}

function getLabel(theme: string) {
  if (theme === "light") return "Switch to dark mode"
  if (theme === "dark") return "Switch to system theme"
  return "Switch to light mode"
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()

  const handleToggle = React.useCallback(() => {
    const next = getNextTheme(theme)
    setTheme(next)
  }, [theme, setTheme])

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      aria-label={getLabel(theme)}
      title={getLabel(theme)}
      className={[
        "h-8 w-8 rounded-md border border-transparent bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
        "transition-colors duration-200 ease-out",
        className ?? "",
      ].join(" ")}
    >
      {theme === "light" && <IconSun className="h-4 w-4" aria-hidden="true" />}
      {theme === "dark" && <IconMoon className="h-4 w-4" aria-hidden="true" />}
      {theme === "system" && <IconDeviceDesktop className="h-4 w-4" aria-hidden="true" />}
      <span className="sr-only">{getLabel(theme)}</span>
    </Button>
  )
}
