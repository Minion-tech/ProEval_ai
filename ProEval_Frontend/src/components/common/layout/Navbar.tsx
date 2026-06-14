import Link from "next/link"
import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

const navItems = [
  { title: "Home", href: "/" },
  { title: "Features", href: "/example" },
  { title: "Register", href: "/register" },
  { title: "Login", href: "/login" },
]

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/10 bg-background/90 text-foreground shadow-sm shadow-neutral-900/5 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
          <Sparkles className="h-5 w-5" />
          <span>ProEval</span>
        </Link>

        <nav className="flex flex-1 items-center gap-2 overflow-x-auto">
          {navItems.map((item) => (
            <Button key={item.href} variant="ghost" size="sm" asChild>
              <Link href={item.href}>{item.title}</Link>
            </Button>
          ))}
        </nav>

        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/dashboard">Project Coordinator Dashboard</Link>
        </Button>
      </div>
    </header>
  )
}
