"use client"

import Link from "next/link"
import { Sparkles } from "lucide-react"

export default function Footer() {
  return (
    <footer className="aceternity border-t border-border/10 bg-background/80 text-foreground backdrop-blur-xl">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 md:px-6">
        
        {/* Top Section */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          
          {/* Brand and Tagline */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-primary font-semibold uppercase tracking-[0.2em]">
              <Sparkles className="h-5 w-5" />
              <span>ProEval</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Fair evaluations. Smarter supervision. Happier students.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="mb-3 text-sm font-semibold">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/features">Features</Link></li>
              <li><Link href="/how-it-works">How it works</Link></li>
              <li><Link href="/pricing">Pricing</Link></li>
              <li><Link href="/changelog">Changelog</Link></li>
            </ul>
          </div>

          {/* For teams */}
          <div>
            <h4 className="mb-3 text-sm font-semibold">For teams</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/department-heads">Department heads</Link></li>
              <li><Link href="/research-committees">Research committees</Link></li>
              <li><Link href="/project-coordinators">Project Coordinators</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="mb-3 text-sm font-semibold">Resources</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/documentation">Documentation</Link></li>
              <li><Link href="/api-reference">API reference</Link></li>
              <li><Link href="/privacy-policy">Privacy policy</Link></li>
              <li><Link href="/terms-of-service">Terms of service</Link></li>
            </ul>
          </div>

        </div>

        {/* Bottom Section */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border/10 pt-6 text-sm text-muted-foreground md:flex-row">
          <p>© 2025 ProEval. Built for educators, powered by AI.</p>
        </div>

      </div>
    </footer>
  )
}