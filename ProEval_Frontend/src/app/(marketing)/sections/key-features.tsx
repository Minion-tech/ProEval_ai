import { FeatureCard } from "../components/features"
import { IconBrain, IconDeviceAnalytics, IconRocket, IconTimeline } from "@tabler/icons-react"

export function KeyFeatures() {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="border-t border-border bg-muted/30 px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
    >
      <div className="mx-auto w-full max-w-7xl">
        <div className="max-w-3xl">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary" aria-hidden="true">
            04
          </span>
          <h2
            id="features-heading"
            className="mt-3 text-3xl font-bold leading-[0.95] tracking-[-0.02em] text-foreground sm:text-4xl lg:text-5xl"
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
            icon={IconBrain}
            title="AI Evaluation"
            description="Structured technical feedback at each phase helps you understand where your project stands and what to improve next."
          />
          <FeatureCard
            number="02"
            icon={IconTimeline}
            title="Phase Tracking"
            description="Follow a clear path from team setup to final viva — know where you are and what comes next."
          />
          <FeatureCard
            number="03"
            icon={IconRocket}
            title="Guided Progress"
            description="Milestones, next-step prompts, and phase status keep your project moving without guesswork."
          />
          <FeatureCard
            number="04"
            icon={IconDeviceAnalytics}
            title="Actionable Insights"
            description="Feedback is broken into guidance, risks, and next actions — not just a score."
          />
        </div>
      </div>
    </section>
  )
}
