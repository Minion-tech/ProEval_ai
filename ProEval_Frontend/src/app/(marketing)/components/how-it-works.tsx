function StepItem({
  number,
  title,
  description,
}: {
  number: string
  title: string
  description: string
}) {
  return (
    <div className="group flex gap-6">
      <span className="shrink-0 text-3xl font-bold text-primary/15 transition-colors duration-200 group-hover:text-primary/30">
        {number}
      </span>
      <div>
        <h4 className="mb-1 text-xl font-bold tracking-tight">{title}</h4>
        <p className="leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-border bg-background px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-16">
          <h2 className="text-4xl font-bold tracking-tight md:text-5xl">How It Works</h2>
        </div>

        <p className="mb-12 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          We have simplified the complex project evaluation process into clear, actionable phases.
        </p>

        <div className="space-y-8">
          <StepItem number="01" title="ENROLL & REGISTER" description="Register your project domain and provide key objectives." />
          <StepItem
            number="02"
            title="PHASED SUBMISSIONS"
            description="Upload your work in organized phases with AI-powered preliminary feedback."
          />
          <StepItem
            number="03"
            title="FINAL EVALUATION"
            description="Complete your review with consolidated reports and clear metrics."
          />
        </div>
      </div>
    </section>
  )
}
