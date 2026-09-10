import { FeatureCard } from "../components/features"
import { IconBrain, IconDeviceAnalytics, IconRocket, IconTimeline } from "@tabler/icons-react"

export function KeyFeatures() {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="border-t border-border bg-background px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
    >
      <div className="mx-auto w-full max-w-7xl">
        <div className="max-w-3xl">
          <h2
            id="features-heading"
            className="text-3xl font-bold leading-[0.95] tracking-[-0.02em] text-foreground sm:text-4xl lg:text-5xl"
          >
            What ProEval helps you do
          </h2>
          <p className="mt-4 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            Four product capabilities — built around the actual student workspace — that keep projects moving from
            first proposal to final viva.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:mt-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          <FeatureCard
            number="01"
            icon={IconTimeline}
            title="Build with structure"
            description="Know exactly what comes next at every stage."
          />
          <FeatureCard
            number="02"
            icon={IconDeviceAnalytics}
            title="Evaluate with clarity"
            description="Structured evaluation replaces fragmented feedback."
          />
          <FeatureCard
            number="03"
            icon={IconBrain}
            title="Improve with AI"
            description="Turn feedback into concrete improvements."
          />
          <FeatureCard
            number="04"
            icon={IconRocket}
            title="Defend with confidence"
            description="Prepare for technical viva with intelligent guidance."
          />
        </div>
      </div>
    </section>
  )
}
