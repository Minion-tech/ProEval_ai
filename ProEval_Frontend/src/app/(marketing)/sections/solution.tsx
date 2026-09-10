export function Solution() {
  return (
    <section
      id="solution"
      aria-labelledby="solution-heading"
      className="border-t border-border bg-background px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
    >
      <div className="mx-auto w-full max-w-7xl">
        <div className="max-w-3xl">
          <h2
            id="solution-heading"
            className="text-3xl font-bold leading-[0.95] tracking-[-0.02em] text-foreground sm:text-4xl lg:text-5xl"
          >
            The Solution
          </h2>
          <p className="mt-4 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            One structured evaluation workflow — from team formation to final viva — with feedback that guides the next
            stage.
          </p>
        </div>

        {/* Visual mapping: Problem → ProEval */}
        <div className="mt-10 grid gap-3 sm:mt-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">If fragmented →</p>
            <p className="mt-2 text-sm font-semibold tracking-tight text-foreground">One workflow</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Team → Proposal → Architecture → Final → Viva.</p>
          </div>
          <div className="rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">If unclear →</p>
            <p className="mt-2 text-sm font-semibold tracking-tight text-foreground">Clear phases</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Know where you are and what is next.</p>
          </div>
          <div className="rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">If delayed →</p>
            <p className="mt-2 text-sm font-semibold tracking-tight text-foreground">Stage feedback</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Structured feedback at each evaluation.</p>
          </div>
          <div className="rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">If disconnected →</p>
            <p className="mt-2 text-sm font-semibold tracking-tight text-foreground">Connected journey</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">One project, one timeline, one workspace.</p>
          </div>
        </div>

        {/* Bridge to Workflow — avoids duplicating the full journey */}
        <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6 sm:mt-10 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">
            The journey below shows the actual five stages from your workspace — team to viva — in order.
          </p>
          <a
            href="#workflow"
            className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-border bg-card px-4 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Jump to workflow journey"
          >
            See the workflow
            <span aria-hidden="true" className="ml-1.5">
              →
            </span>
          </a>
        </div>
      </div>
    </section>
  )
}
