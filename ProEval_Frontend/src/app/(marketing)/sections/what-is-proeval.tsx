export function WhatIsProEval() {
  return (
    <section
      id="what-is"
      aria-labelledby="what-is-heading"
      className="border-t border-border bg-muted/30 px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
    >
      <div className="mx-auto w-full max-w-7xl">
        <div className="max-w-3xl">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary" aria-hidden="true">
            01
          </span>
          <h2
            id="what-is-heading"
            className="mt-3 text-3xl font-bold leading-[0.95] tracking-[-0.02em] text-foreground sm:text-4xl lg:text-5xl"
          >
            What is ProEval?
          </h2>

          <p className="mt-6 max-w-[28ch] text-balance text-2xl font-bold leading-[1.08] tracking-[-0.02em] text-foreground sm:mt-8 sm:text-3xl lg:text-[2.1rem]">
            ProEval brings academic project evaluation into one structured workflow.
          </p>

          <p className="mt-5 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            An academic evaluation platform that guides students from team setup and proposal submission through
            architecture, final evaluation and AI technical viva — with clear phases and feedback at every stage.
          </p>

          <div className="mt-8 flex flex-wrap gap-2" aria-label="Core principles">
            <span className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs font-medium tracking-[-0.01em] text-muted-foreground">
              Team setup → Proposal → Architecture → Final → Viva
            </span>
            <span className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              Structured · Evaluated · Improved
            </span>
          </div>
        </div>

        <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:mt-16 lg:grid-cols-3">
          <div className="bg-card px-6 py-6 sm:px-8 sm:py-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">For students</p>
            <p className="mt-3 text-sm font-medium leading-6 text-foreground">
              Know what to do next, track progress, and improve through evaluation — not guesswork.
            </p>
          </div>
          <div className="bg-card px-6 py-6 sm:px-8 sm:py-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">For teams</p>
            <p className="mt-3 text-sm font-medium leading-6 text-foreground">
              Leaders submit, members contribute, everyone sees shared progress and feedback.
            </p>
          </div>
          <div className="bg-card px-6 py-6 sm:px-8 sm:py-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">For evaluation</p>
            <p className="mt-3 text-sm font-medium leading-6 text-foreground">
              Each phase is reviewed with structured feedback to guide the next submission.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
