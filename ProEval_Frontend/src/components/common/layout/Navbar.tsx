"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { Menu, X, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

const navItems = [
  { title: "Home", href: "/" },
  { title: "About", href: "/#what-is" },
  { title: "Features", href: "/#features" },
  { title: "How It Works", href: "/#how-it-works" },
]

export default function Navbar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [hash, setHash] = useState("")

  useEffect(() => {
    const updateHash = () => setHash(window.location.hash)
    updateHash()
    window.addEventListener("hashchange", updateHash)
    return () => window.removeEventListener("hashchange", updateHash)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false)
  }, [pathname, hash])

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [mobileOpen])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false)
    }
    if (mobileOpen) window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [mobileOpen])

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/" && hash === ""
    if (href.startsWith("/#")) {
      return pathname === "/" && hash === href.slice(1)
    }
    return pathname === href
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-[64px] w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 md:h-[68px]">
        {/* Brand — typography only */}
        <Link
          href="/"
          className="shrink-0 text-[19px] font-semibold tracking-[-0.02em] text-foreground transition-opacity duration-200 hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="ProEval — Home"
        >
          ProEval
        </Link>

        {/* Desktop Navigation — centered */}
        <nav
          aria-label="Primary"
          className="hidden items-center gap-7 md:flex lg:gap-8"
        >
          {navItems.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "relative py-2 text-[14px] font-medium tracking-[-0.01em] transition-colors duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {item.title}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[1px] h-px bg-foreground md:bottom-[-10px]"
                  />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden shrink-0 items-center gap-3 md:flex lg:gap-5">
          <Link
            href="/login"
            className="inline-flex h-8 items-center text-[14px] font-medium tracking-[-0.01em] text-muted-foreground transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Login
          </Link>

          <Button
            asChild
            size="sm"
            className="group h-8 rounded-md bg-primary px-4 text-[13px] font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Link href="/register" className="inline-flex items-center gap-1.5">
              Get Started
              <ArrowRight
                aria-hidden="true"
                className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
              />
            </Link>
          </Button>
        </div>

        {/* Mobile Actions */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground transition-colors duration-200 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Panel — card surface over background */}
      {mobileOpen && (
        <div
          id="mobile-nav"
          className="absolute inset-x-0 top-[64px] z-50 max-h-[calc(100dvh-64px)] overflow-y-auto border-t border-border bg-card md:hidden md:top-[68px] md:max-h-[calc(100dvh-68px)]"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
        >
          <nav aria-label="Mobile primary" className="px-4 py-2 sm:px-6">
            <ul className="divide-y divide-border">
              {navItems.map((item) => {
                const active = isActive(item.href)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setMobileOpen(false)}
                      className={[
                        "flex w-full items-center justify-between py-4 text-[15px] font-medium tracking-[-0.01em] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                        active
                          ? "text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      ].join(" ")}
                    >
                      <span>{item.title}</span>
                      {active && (
                        <span
                          aria-hidden="true"
                          className="h-1.5 w-1.5 rounded-full bg-primary"
                        />
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>

            <div className="mt-2 flex flex-col gap-3 border-t border-border pt-6 pb-6">
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border bg-background px-4 text-[14px] font-medium text-foreground transition-colors duration-200 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Login
              </Link>
              <Button
                asChild
                size="default"
                className="group min-h-11 w-full rounded-md bg-primary text-[14px] font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex items-center gap-1.5"
                >
                  Get Started
                  <ArrowRight
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                  />
                </Link>
              </Button>
            </div>
          </nav>
        </div>
      )}

      {/* Backdrop for mobile */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 top-[64px] z-40 bg-foreground/5 backdrop-blur-[1px] md:hidden md:top-[68px]"
          tabIndex={-1}
        />
      )}
    </header>
  )
}
