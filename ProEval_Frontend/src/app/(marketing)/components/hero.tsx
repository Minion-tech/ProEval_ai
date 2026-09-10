import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AnimatedButton } from "@/components/ui/animated-button"
import { Spotlight } from "@/components/ui/spotlight-new"
import { IconArrowRight } from "@tabler/icons-react"

export function Hero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative isolate overflow-hidden bg-background"
    >
      {/* Subtle spotlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-60 dark:opacity-40"
      >
        <Spotlight
          gradientFirst="radial-gradient(68.54% 68.72% at 55.02% 31.46%, hsla(30, 8%, 88%, 0.55) 0, hsla(30, 6%, 92%, 0.18) 50%, transparent 80%)"
          gradientSecond="radial-gradient(50% 50% at 50% 50%, hsla(30, 8%, 90%, 0.35) 0, hsla(30, 6%, 93%, 0.12) 80%, transparent 100%)"
          gradientThird="radial-gradient(50% 50% at 50% 50%, hsla(30, 8%, 92%, 0.20) 0, hsla(30, 6%, 94%, 0.08) 80%, transparent 100%)"
          translateY={-360}
          width={520}
          height={1280}
          smallWidth={220}
          duration={10}
          xOffset={80}
        />
      </div>

      {/* Gentle vignette */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-transparent via-transparent to-background/60"
      />

      {/* Hero content */}
      <div className="relative z-10 mx-auto flex min-h-[560px] w-full max-w-7xl items-center justify-center px-4 py-20 text-center sm:min-h-[600px] sm:px-6 sm:py-24 md:min-h-[640px] md:py-28 lg:min-h-[700px] lg:px-8 lg:py-32">
        <div className="flex w-full max-w-4xl flex-col items-center">
          {/* Main headline */}

          <h1
            id="hero-heading"
            className="max-w-[13ch] text-balance text-[3.25rem] font-bold leading-[0.9] tracking-[-0.05em] text-foreground sm:text-6xl md:text-7xl lg:text-[5.5rem] xl:text-[6.25rem]"
          >
            Turn your
            <br />
            project into
            <br />
            <span className="font-bold text-foreground/40">
              proof.
            </span>
          </h1>

          {/* Supporting description */}
          <p className="mt-7 max-w-[48ch] text-pretty text-[15px] leading-7 text-muted-foreground sm:mt-8 sm:text-[17px] md:text-lg md:leading-8 lg:text-[19px]">
            Build, submit, evaluate, and improve your academic project with
            structured feedback and AI-powered guidance—so you are ready to
            present and defend your work with confidence.
          </p>

          {/* CTA buttons */}
          <div className="mt-9 flex w-full flex-col items-center justify-center gap-3 sm:mt-10 sm:w-auto sm:flex-row">

            {/* Primary CTA */}
            <AnimatedButton
              className="h-11 w-full justify-center rounded-lg px-7 text-[14px] font-semibold shadow-sm sm:h-12 sm:w-auto sm:text-[15px]"
              asChild
            >
              <Link
                href="/register"
                aria-label="Get started — create your ProEval account"
              >
                Get Started
                <IconArrowRight
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0"
                />
              </Link>
            </AnimatedButton>

            {/* Secondary CTA */}
            <Button
              variant="outline"
              size="lg"
              className="h-11 w-full justify-center rounded-lg border border-border bg-card px-7 text-[14px] font-semibold text-foreground shadow-sm transition-colors duration-200 hover:bg-muted hover:text-foreground focus-visible:ring-ring/10 sm:h-12 sm:w-auto sm:text-[15px]"
              asChild
            >
              <Link
                href="/student/dashboard"
                aria-label="View demo — open student dashboard"
              >
                View Demo
              </Link>
            </Button>
          </div>

          {/* Product positioning */}
          <div className="mt-9 flex items-center justify-center gap-3 sm:mt-10">
            <span
              aria-hidden="true"
              className="h-px w-7 bg-border sm:w-8"
            />

            <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/60 sm:text-xs sm:tracking-[0.18em]">
              Build · Evaluate · Improve · Defend
            </span>

            <span
              aria-hidden="true"
              className="h-px w-7 bg-border sm:w-8"
            />
          </div>

        </div>
      </div>
    </section>
  )
}