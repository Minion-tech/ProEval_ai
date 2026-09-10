import Link from "next/link"
import {
  IconArrowUpRight,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandX,
  IconMail,
  IconSend,
  IconShieldCheck,
} from "@tabler/icons-react"

const footerSections = [
  {
    title: "Quick Links",
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

const socialLinks = [
  {
    label: "Instagram",
    href: "#",
    icon: IconBrandInstagram,
  },
  {
    label: "LinkedIn",
    href: "#",
    icon: IconBrandLinkedin,
  },
  {
    label: "X",
    href: "#",
    icon: IconBrandX,
  },
]

export default function Footer() {
  return (
    <footer className="border-t border-border bg-background text-foreground">
      <div className="mx-auto w-full max-w-7xl px-6 sm:px-8 lg:px-10">

        {/* Main Footer */}
        <div className="grid gap-12 py-14 md:grid-cols-2 lg:grid-cols-4 lg:gap-16 lg:py-16">

          {/* Stay Connected */}
          <div className="lg:max-w-sm">

            {/* Brand */}
            <Link
              href="/"
              className="group inline-flex items-center gap-3"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform duration-200 group-hover:scale-105">
                <IconShieldCheck className="h-5 w-5" />
              </span>

              <span className="text-xl font-bold tracking-tight">
                ProEval AI
              </span>
            </Link>

            <h2 className="mt-6 text-xl font-semibold tracking-tight">
              Stay Connected
            </h2>

            <p className="mt-3 max-w-xs text-sm leading-6 text-muted-foreground">
              Get the latest ProEval updates, platform improvements, and
              academic evaluation insights.
            </p>

            {/* Newsletter */}
            <form
              className="mt-6 flex max-w-sm items-center"
              onSubmit={(event) => event.preventDefault()}
            >
              <label
                htmlFor="footer-email"
                className="sr-only"
              >
                Email address
              </label>

              <div className="relative flex w-full items-center">

                <IconMail
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground"
                />

                <input
                  id="footer-email"
                  type="email"
                  placeholder="Enter your email"
                  className="h-11 w-full rounded-lg border border-border bg-background pl-10 pr-12 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                />

                <button
                  type="submit"
                  aria-label="Subscribe to newsletter"
                  className="absolute right-1.5 flex h-8 w-8 items-center justify-center rounded-md bg-foreground text-background transition-all duration-200 hover:scale-105 hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <IconSend
                    aria-hidden="true"
                    className="h-3.5 w-3.5"
                  />
                </button>

              </div>
            </form>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-5 text-sm font-semibold tracking-tight">
              Quick Links
            </h3>

            <ul className="space-y-3">
              {footerSections[0].links.map((link) => (
                <li key={`${link.label}-${link.href}`}>
                  <Link
                    href={link.href}
                    className="group inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <span>{link.label}</span>

                    <IconArrowUpRight
                      aria-hidden="true"
                      className="h-3.5 w-3.5 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Workflow */}
          <div>
            <h3 className="mb-5 text-sm font-semibold tracking-tight">
              Workflow
            </h3>

            <ul className="space-y-3">
              {footerSections[1].links.map((link) => (
                <li key={`${link.label}-${link.href}`}>
                  <Link
                    href={link.href}
                    className="group inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <span>{link.label}</span>

                    <IconArrowUpRight
                      aria-hidden="true"
                      className="h-3.5 w-3.5 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Follow Us */}
          <div>
            <h3 className="mb-5 text-sm font-semibold tracking-tight">
              Follow Us
            </h3>

            <p className="max-w-xs text-sm leading-6 text-muted-foreground">
              Follow ProEval for platform updates, academic evaluation
              resources, and new features.
            </p>

            {/* Social Links */}
            <div className="mt-6 flex items-center gap-3">
              {socialLinks.map((social) => {
                const Icon = social.icon

                return (
                  <a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    onClick={(event) => {
                      if (social.href === "#") {
                        event.preventDefault()
                      }
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground transition-all duration-200 hover:border-foreground hover:bg-foreground hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Icon
                      aria-hidden="true"
                      className="h-4 w-4"
                    />
                  </a>
                )
              })}
            </div>

            {/* Account */}
            <div className="mt-7 space-y-2.5">
              {footerSections[2].links.map((link) => (
                <Link
                  key={`${link.label}-${link.href}`}
                  href={link.href}
                  className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="flex flex-col gap-5 border-t border-border py-6 text-sm text-muted-foreground lg:flex-row lg:items-center lg:justify-between">

          {/* Copyright */}
          <p className="shrink-0">
            © {new Date().getFullYear()} ProEval AI. All rights reserved.
          </p>

          {/* Description */}
          <p className="text-muted-foreground/70">
            Academic Evaluation &amp; Supervision Platform
          </p>

          {/* Legal Links — placeholders, prevent broken routes */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="transition-colors hover:text-foreground"
              aria-label="Privacy Policy (coming soon)"
            >
              Privacy Policy
            </a>

            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="transition-colors hover:text-foreground"
              aria-label="Terms of Service (coming soon)"
            >
              Terms of Service
            </a>

            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="transition-colors hover:text-foreground"
              aria-label="Cookie Settings (coming soon)"
            >
              Cookie Settings
            </a>
          </div>
        </div>

      </div>
    </footer>
  )
}