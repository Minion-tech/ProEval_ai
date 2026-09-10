export function WhatIsProEval() {
  const workflow = [
    {
      number: "01",
      title: "Team setup",
      description: "Create your project team and establish roles.",
    },
    {
      number: "02",
      title: "Proposal",
      description: "Submit your idea with goals, scope, and direction.",
    },
    {
      number: "03",
      title: "Architecture",
      description: "Turn your proposal into a clear technical plan.",
    },
    {
      number: "04",
      title: "Final evaluation",
      description: "Present the completed project for structured review.",
    },
    {
      number: "05",
      title: "AI technical viva",
      description: "Demonstrate your technical understanding through viva.",
    },
  ]

  const audiences = [
    {
      label: "Students",
      title: "Know what comes next.",
      description:
        "Move through every project phase with clear expectations, deadlines, feedback, and progress visibility.",
    },
    {
      label: "Teams",
      title: "Build together, stay aligned.",
      description:
        "Keep submissions, contributions, responsibilities, and project progress connected in one shared workflow.",
    },
    {
      label: "Evaluators",
      title: "Evaluate with structure.",
      description:
        "Review each phase consistently, leave meaningful feedback, and guide teams toward stronger submissions.",
    },
  ]

  return (
    <section
      id="what-is"
      aria-labelledby="what-is-heading"
      className="relative overflow-hidden border-t border-border bg-muted/30 px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-32"
    >
      {/* Subtle background detail */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_15%,hsl(var(--primary)/0.08),transparent_28%)]"
      />

      <div className="relative mx-auto w-full max-w-7xl">
        {/* Section header */}
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.4fr] lg:items-end">
          <div>
            <div className="flex items-center gap-3">
              <span
                className="text-xs font-semibold uppercase tracking-[0.2em] text-primary"
                aria-hidden="true"
              >
                01
              </span>

              <span className="h-px w-10 bg-border" aria-hidden="true" />

              <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                The platform
              </span>
            </div>

            <h2
              id="what-is-heading"
              className="mt-5 max-w-xl text-4xl font-bold leading-[0.94] tracking-[-0.04em] text-foreground sm:text-5xl lg:text-6xl"
            >
              What is{" "}
              <span className="text-primary">ProEval?</span>
            </h2>
          </div>

          <div className="max-w-2xl lg:ml-auto">
            <p className="text-balance text-2xl font-semibold leading-[1.12] tracking-[-0.025em] text-foreground sm:text-3xl">
              A structured system for taking academic projects from{" "}
              <span className="text-muted-foreground">idea to evaluation.</span>
            </p>

            <p className="mt-5 max-w-xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              ProEval brings team collaboration, project submissions,
              technical evaluation, feedback, and AI-powered viva into one
              connected academic workflow.
            </p>
          </div>
        </div>

        {/* Workflow */}
        <div className="mt-16 sm:mt-20">
          <div className="mb-5 flex items-end justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                One connected workflow
              </p>

              <p className="mt-2 text-sm text-muted-foreground">
                Every phase has a purpose, submission, and evaluation.
              </p>
            </div>

            <span
              className="hidden text-xs font-medium text-muted-foreground sm:block"
              aria-hidden="true"
            >
              01 — 05
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="grid divide-y divide-border lg:grid-cols-5 lg:divide-x lg:divide-y-0">
              {workflow.map((item, index) => (
                <div
                  key={item.number}
                  className="group relative px-5 py-6 transition-colors duration-200 hover:bg-muted/40 sm:px-6 sm:py-7"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-xs font-semibold tracking-[0.15em] text-primary">
                      {item.number}
                    </span>

                    {index < workflow.length - 1 && (
                      <span
                        className="hidden text-muted-foreground/40 lg:block"
                        aria-hidden="true"
                      >
                        →
                      </span>
                    )}
                  </div>

                  <h3 className="mt-10 text-base font-semibold tracking-[-0.01em] text-foreground">
                    {item.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {item.description}
                  </p>

                  <div
                    className="mt-6 h-px w-8 bg-border transition-all duration-200 group-hover:w-14 group-hover:bg-primary"
                    aria-hidden="true"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Core value statement */}
        <div className="mt-12 grid gap-6 lg:grid-cols-[1fr_2fr]">
          <div className="rounded-2xl border border-border bg-foreground p-7 text-background sm:p-9">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] opacity-60">
              The idea
            </span>

            <p className="mt-8 max-w-sm text-2xl font-semibold leading-tight tracking-[-0.025em] sm:text-3xl">
              Replace scattered project work with one structured system.
            </p>

            <p className="mt-5 max-w-sm text-sm leading-6 opacity-65">
              From the first proposal to the final viva, ProEval keeps the
              entire evaluation journey connected.
            </p>
          </div>

          <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
            {audiences.map((audience) => (
              <div
                key={audience.label}
                className="bg-card p-7 sm:p-8"
              >
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  {audience.label}
                </span>

                <h3 className="mt-5 text-xl font-semibold leading-tight tracking-[-0.02em] text-foreground">
                  {audience.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {audience.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom principle strip */}
        <div className="mt-8 flex flex-col gap-4 rounded-xl border border-border bg-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-sm font-medium text-foreground">
            Structured. Evaluated. Improved.
          </p>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
            <span>Clear phases</span>
            <span aria-hidden="true">·</span>
            <span>Shared progress</span>
            <span aria-hidden="true">·</span>
            <span>Actionable feedback</span>
            <span aria-hidden="true">·</span>
            <span>AI-powered viva</span>
          </div>
        </div>
      </div>
    </section>
  )
}