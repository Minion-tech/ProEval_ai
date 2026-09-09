import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Spotlight } from "@/components/ui/spotlight-new"
import { IconArrowRight } from "@tabler/icons-react"

export function Hero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative isolate overflow-hidden bg-black"
    >
      {/* Spotlight — subtle premium background, never covers content */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      >
        <Spotlight
          gradientFirst="radial-gradient(68.54% 68.72% at 55.02% 31.46%, hsla(210, 100%, 85%, .06) 0, hsla(210, 100%, 55%, .015) 50%, hsla(210, 100%, 45%, 0) 80%)"
          gradientSecond="radial-gradient(50% 50% at 50% 50%, hsla(210, 100%, 85%, .04) 0, hsla(210, 100%, 55%, .015) 80%, transparent 100%)"
          gradientThird="radial-gradient(50% 50% at 50% 50%, hsla(210, 100%, 85%, .025) 0, hsla(210, 100%, 45%, .012) 80%, transparent 100%)"
          translateY={-360}
          width={520}
          height={1280}
          smallWidth={220}
          duration={8}
          xOffset={80}
        />
      </div>

      {/* Readability overlay — ensures text contrast vs spotlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-black/10 via-black/0 to-black/35"
      />

      {/* Content — aligned to Navbar max-w-7xl + px system */}
      <div className="relative z-10 mx-auto flex min-h-[560px] w-full max-w-7xl items-center px-4 py-16 sm:min-h-[600px] sm:px-6 sm:py-20 md:min-h-[640px] md:py-24 lg:min-h-[700px] lg:py-28">
        <div className="w-full max-w-3xl lg:max-w-[46rem]">
          {/* Eyebrow */}
          <div className="mb-6 sm:mb-7">
            <span className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.035] px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white/60 backdrop-blur-sm sm:px-4 sm:py-2 sm:text-xs sm:tracking-[0.2em]">
              Academic Evaluation Platform
            </span>
          </div>

          {/* Headline — primary hierarchy */}
          <h1
            id="hero-heading"
            className="max-w-[14ch] text-balance text-[2.625rem] font-bold leading-[0.9] tracking-[-0.04em] text-white sm:text-6xl md:text-7xl lg:text-[5.25rem] xl:text-[5.75rem]"
          >
            Build.
            <br />
            Submit.
            <br />
            <span className="font-bold text-white/50">Improve.</span>
          </h1>

          {/* Supporting description — scannable, no unsupported claims */}
          <p className="mt-6 max-w-[42ch] text-pretty text-[15px] leading-7 text-white/60 sm:mt-7 sm:max-w-xl sm:text-[17px] md:text-lg md:leading-8 lg:max-w-2xl lg:text-[19px]">
            A structured project evaluation platform designed to help students
            build better projects, submit with confidence, and improve through
            meaningful feedback.
          </p>

          {/* CTAs — primary dominates, secondary visible, both accessible */}
          <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:items-center">
            <Button
              size="lg"
              className="h-11 w-full justify-center bg-white px-6 text-[14px] font-semibold text-black hover:bg-white/90 focus-visible:ring-white/30 sm:h-12 sm:w-auto sm:text-[15px]"
              asChild
            >
              <Link href="/register" aria-label="Get started — create your ProEval account">
                Get Started
                <IconArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
              </Link>
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="h-11 w-full justify-center border-white/10 bg-white/[0.04] px-6 text-[14px] font-semibold text-white backdrop-blur-sm hover:bg-white/10 hover:text-white focus-visible:border-white/20 focus-visible:ring-white/20 sm:h-12 sm:w-auto sm:text-[15px]"
              asChild
            >
              <Link href="/student/dashboard" aria-label="View demo — open student dashboard">
                View Demo
              </Link>
            </Button>
          </div>

          {/* Micro detail — optional, subtle */}
          <div className="mt-8 flex items-center gap-3 sm:mt-10">
            <span aria-hidden="true" className="h-px w-7 bg-white/10 sm:w-8" />
            <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/30 sm:text-xs sm:tracking-[0.18em]">
              Structured · Evaluated · Improved
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
