import Link from "next/link"
import { Button } from "@/components/ui/button"
import { IconArrowRight } from "@tabler/icons-react"

export function CTA() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <div className="border-t border-border pt-24 text-center">
          <h2 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl">Ready to start?</h2>
          <p className="mx-auto mb-12 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Begin your project evaluation journey with a clearer path from team setup to final assessment.
          </p>
          <Button size="lg" asChild>
            <Link href="/register">
              Get Started
              <IconArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
