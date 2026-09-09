import Link from "next/link"
import { ShieldCheck } from "lucide-react"

const footerSections = [
  {
    title: "Platform",
    links: [
      { label: "Student Portal", href: "/student/dashboard" },
      { label: "Team Setup", href: "/student/team" },
      { label: "AI Guidance", href: "/student/feedback" },
      { label: "Coordinator Portal", href: "/admin/dashboard" },
    ],
  },
  {
    title: "Workflow",
    links: [
      { label: "Phase 1: Proposal", href: "/student/submit/phase1" },
      { label: "Phase 2: Architecture", href: "/student/submit/phase2" },
      { label: "Phase 3: Showcase", href: "/student/submit/final" },
      { label: "AI Technical Viva", href: "/student/feedback" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Student Login", href: "/login" },
      { label: "Student Registration", href: "/register" },
      { label: "Coordinator Login", href: "/login" },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="border-t border-sidebar-border bg-secondary text-foreground">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Main Footer */}
        <div className="grid gap-12 py-14 md:grid-cols-2 lg:grid-cols-4 lg:gap-16">

          {/* Brand */}
          <div className="space-y-4 lg:max-w-xs">
            <Link
              href="/"
              className="group inline-flex items-center gap-2.5"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-foreground">
                <ShieldCheck className="h-5 w-5" />
              </span>

              <span className="text-lg font-bold tracking-tight text-foreground">
                ProEval AI
              </span>
            </Link>

            <p className="max-w-sm text-xs leading-5 text-muted-foreground">
              Automated academic project evaluation, AI mentorship, and interactive technical viva assessment.
            </p>
          </div>

          {/* Footer Links */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-primary">
                {section.title}
              </h3>

              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-xs text-muted-foreground transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Footer */}
        <div className="flex flex-col gap-4 border-t border-sidebar-border py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} ProEval AI. All rights reserved.
          </p>

          <p className="text-muted-foreground/60">
            Academic Evaluation & Supervision Platform
          </p>
        </div>

      </div>
    </footer>
  )
}
